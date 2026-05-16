const { Op } = require("sequelize");
const { InscripcionMensual, Clase, ReservaClase, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { generarReservasMensual } = require("./reservas.service");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

/**
 * Valida las reglas de negocio de una inscripción mensual antes de crear o actualizar.
 * @param {object} data
 * @param {number|null} inscripcionIdActual
 */
const validarInscripcionMensual = async (data, inscripcionIdActual = null) => {
  // 1. Estado válido
  if (data.estado !== undefined && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de inscripción no válido");
  }

  // 2. Rango de fechas coherente
  if (data.periodo_inicio && data.periodo_fin && data.periodo_fin <= data.periodo_inicio) {
    throw httpError(400, "periodo_fin debe ser posterior a periodo_inicio");
  }

  // 3. Detecta superposición de fechas (permite renovaciones anticipadas sin pisarse)
  if (data.cliente_email && data.actividad_id && data.periodo_inicio && data.periodo_fin) {
    const whereInscripcion = {
      cliente_email: data.cliente_email,
      actividad_id: data.actividad_id,
      estado: ["VIGENTE", "EN_GRACIA"],
      periodo_inicio: { [Op.lt]: data.periodo_fin },
      periodo_fin: { [Op.gt]: data.periodo_inicio },
    };
    if (inscripcionIdActual) {
      whereInscripcion.id = { [Op.ne]: inscripcionIdActual };
    }
    const overlapping = await InscripcionMensual.findOne({ where: whereInscripcion });
    if (overlapping) {
      throw httpError(400, "El cliente ya tiene una inscripción mensual que se superpone con las fechas indicadas");
    }
  }
};

/**
 * Crea la InscripcionMensual y genera automáticamente todas las
 * ReservaClase concretas para cada fecha del período usando transacciones.
 */
const crearInscripcionMensual = async (data) => {
  await validarInscripcionMensual(data);

  return conn.transaction(async (transaction) => {
    const clase = await Clase.findByPk(data.clase_id, { transaction });
    if (!clase) {
      throw httpError(404, "La clase no existe");
    }
    if (!clase.activa) {
      throw httpError(400, "La clase seleccionada se encuentra inactiva o dada de baja");
    }

    const inscripcion = await InscripcionMensual.create(data, { transaction });
    await generarReservasMensual(inscripcion, clase, { transaction });

    return InscripcionMensual.findByPk(inscripcion.id, {
      include: [{ model: ReservaClase, as: "reservas" }],
      transaction,
    });
  });
};

/**
 * Actualiza una InscripcionMensual existente re-validando reglas de negocio.
 * Gestiona el ciclo de vida de las ReservaClase futuras según el tipo de cambio.
 */
const actualizarInscripcionMensual = async (inscripcion, data) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const estadosCancelacion = ["CANCELADA", "SUSPENDIDA"];

  const estadoCambia = data.estado && estadosCancelacion.includes(data.estado);
  const fechasCambian = data.periodo_inicio !== undefined || data.periodo_fin !== undefined;
  const claseCambia = data.clase_id !== undefined && data.clase_id !== inscripcion.clase_id;

  // Solo validar superposición si cambian fechas o clase
  if (fechasCambian || claseCambia) {
    const dataAValidar = { ...inscripcion.toJSON(), ...data };
    await validarInscripcionMensual(dataAValidar, inscripcion.id);
  } else if (data.estado && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de inscripción no válido");
  }

  if (estadoCambia || fechasCambian || claseCambia) {
    await conn.transaction(async (transaction) => {
      // Eliminar reservas futuras existentes
      await ReservaClase.destroy({
        where: {
          inscripcion_mensual_id: inscripcion.id,
          fecha_exacta: { [Op.gte]: hoy },
        },
        transaction,
      });

      // Si no es cancelación/suspensión, regenerar reservas con nuevos parámetros
      if (!estadoCambia && (fechasCambian || claseCambia)) {
        const claseIdFinal = data.clase_id ?? inscripcion.clase_id;
        const clase = await Clase.findByPk(claseIdFinal, { transaction });
        if (!clase) throw httpError(404, "La clase no existe");

        const inicioFinal = data.periodo_inicio ?? inscripcion.periodo_inicio;
        const finFinal = data.periodo_fin ?? inscripcion.periodo_fin;
        const inicioEfectivo = inicioFinal < hoy ? hoy : inicioFinal;

        // Crear un objeto pseudo-inscripción para reutilizar generarReservasMensual
        const pseudoInscripcion = {
          id: inscripcion.id,
          cliente_email: inscripcion.cliente_email,
          periodo_inicio: inicioEfectivo,
          periodo_fin: finFinal,
        };

        await generarReservasMensual(pseudoInscripcion, clase, { transaction });
      }
    });
  }

  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
};
