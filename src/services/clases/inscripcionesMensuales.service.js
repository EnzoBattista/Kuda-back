const { Op } = require("sequelize");
const { InscripcionMensual, Clase, ReservaClase, CancelacionClase, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { generarReservasMensual, fechasDeClaseEnPeriodo } = require("./reservas.service");
const { notificarPrimero } = require("./listaEspera.service");
const { aplicarVale } = require("../pagos/vales.service");

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

  // 3. Detecta superposición de fechas en la MISMA clase (permite renovaciones
  // anticipadas sin pisarse). Un cliente puede tener mensualidades simultáneas
  // en distintas clases aunque sean de la misma actividad. Si todas las
  // reservas de la mensual existente están CANCELADA, se permite re-inscribirse.
  if (data.cliente_email && data.clase_id && data.periodo_inicio && data.periodo_fin) {
    const whereInscripcion = {
      cliente_email: data.cliente_email,
      clase_id: data.clase_id,
      estado: ["VIGENTE", "EN_GRACIA"],
      periodo_inicio: { [Op.lt]: data.periodo_fin },
      periodo_fin: { [Op.gt]: data.periodo_inicio },
    };
    if (inscripcionIdActual) {
      whereInscripcion.id = { [Op.ne]: inscripcionIdActual };
    }
    const overlapping = await InscripcionMensual.findOne({ where: whereInscripcion });
    if (overlapping) {
      const reservasActivas = await ReservaClase.count({
        where: { inscripcion_mensual_id: overlapping.id, estado: "ACTIVA" },
      });
      if (reservasActivas > 0) {
        throw httpError(
          400,
          "El cliente ya tiene una inscripción mensual vigente en esta clase para el período indicado"
        );
      }
    }
  }
};

/**
 * Crea la InscripcionMensual y genera automáticamente todas las
 * ReservaClase concretas para cada fecha del período usando transacciones.
 */
const crearInscripcionMensual = async (data) => {
  const { vale_id, ...datosInscripcion } = data;
  await validarInscripcionMensual(datosInscripcion);

  return conn.transaction(async (transaction) => {
    const clase = await Clase.findByPk(datosInscripcion.clase_id, { transaction });
    if (!clase) {
      throw httpError(404, "La clase no existe");
    }
    if (!clase.activa) {
      throw httpError(400, "La clase seleccionada se encuentra inactiva o dada de baja");
    }

    // Prorratea el monto según las fechas que efectivamente ocurrirán en el
    // período (descuenta las que están canceladas por el CEF). Si no hay
    // ninguna fecha disponible, no se permite la inscripción.
    const fechasPeriodo = fechasDeClaseEnPeriodo(
      clase.dia_semana,
      datosInscripcion.periodo_inicio,
      datosInscripcion.periodo_fin
    );
    if (fechasPeriodo.length === 0) {
      throw httpError(409, "El período seleccionado no tiene ocurrencias de la clase");
    }
    const canceladas = await CancelacionClase.findAll({
      where: { clase_id: clase.id, fecha: { [Op.in]: fechasPeriodo } },
      attributes: ["fecha"],
      transaction,
    });
    const setCanceladas = new Set(canceladas.map((c) => String(c.fecha).slice(0, 10)));
    const fechasEfectivas = fechasPeriodo.filter((f) => !setCanceladas.has(f));
    if (fechasEfectivas.length === 0) {
      throw httpError(
        409,
        "El período seleccionado no tiene clases disponibles (todas las fechas están canceladas)"
      );
    }

    const montoBase = Number(datosInscripcion.monto);
    const montoProrrateado =
      fechasEfectivas.length === fechasPeriodo.length
        ? montoBase
        : Number(((montoBase / fechasPeriodo.length) * fechasEfectivas.length).toFixed(2));

    const { monto_final: montoFinal } = await aplicarVale({
      vale_id,
      cliente_email: datosInscripcion.cliente_email,
      clase_id: clase.id,
      monto_base: montoProrrateado,
      tipo_inscripcion: "MENSUAL",
      transaction,
    });

    const inscripcion = await InscripcionMensual.create(
      { ...datosInscripcion, monto: montoFinal },
      { transaction }
    );
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

  const resultado = await conn.transaction(async (transaction) => {
    if (estadoCambia || fechasCambian || claseCambia) {
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
    }

    return inscripcion.update(data, { transaction });
  });

  // Si se canceló la inscripción mensual, notificar al primero de la lista de espera MENSUAL
  if (data.estado === "CANCELADA") {
    setImmediate(async () => {
      try {
        await notificarPrimero(inscripcion.clase_id, "MENSUAL");
      } catch (err) {
        console.error("[actualizarInscripcionMensual] Error al notificar lista de espera:", err.message);
      }
    });
  }

  return resultado;
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
};
