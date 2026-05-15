const { Op } = require("sequelize");
const { InscripcionMensual, Clase, ReservaClase } = require("../../../db");
const httpError = require("../../utils/httpError");
const { fechasDelMesPorDia } = require("../../utils/fechas");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

/**
 * Valida las reglas de negocio de una inscripción mensual antes de crear o actualizar.
 * Devuelve el objeto Clase para reutilizarlo sin una segunda query.
 * @param {object} data
 * @param {number|null} inscripcionIdActual
 * @returns {Promise<Clase>}
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

  // Detecta superposición de fechas (permite renovaciones anticipadas sin pisarse)
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

  const clase = await Clase.findByPk(data.clase_id);
  if (!clase) {
    throw httpError(404, "La clase no existe");
  }
  if (!clase.activa) {
    throw httpError(400, "La clase seleccionada se encuentra inactiva o dada de baja");
  }

  const ocupacionActual = await ReservaClase.count({
    where: {
      clase_id: data.clase_id,
      estado: "ACTIVA",
    },
  });
  if (ocupacionActual >= clase.cupo) {
    throw httpError(400, "No hay cupo disponible para esta clase");
  }

  return clase;
};

/**
 * Crea la InscripcionMensual y genera automáticamente todas las
 * ReservaClase concretas para cada fecha del período.
 */
const crearInscripcionMensual = async (data) => {
  const clase = await validarInscripcionMensual(data);

  const inscripcion = await InscripcionMensual.create(data);

  const fechas = fechasDelMesPorDia(clase.dia_semana, data.periodo_inicio, data.periodo_fin);

  if (fechas.length > 0) {
    const reservas = fechas.map((fecha_exacta) => ({
      cliente_email: data.cliente_email,
      clase_id: data.clase_id,
      fecha_exacta,
      origen: "MENSUAL",
      origen_id: inscripcion.id,
      estado: "ACTIVA",
      asistio: false,
    }));
    await ReservaClase.bulkCreate(reservas);
  }

  return inscripcion;
};

/**
 * Actualiza una InscripcionMensual existente re-validando reglas de negocio.
 * Gestiona el ciclo de vida de las ReservaClase futuras según el tipo de cambio.
 */
const actualizarInscripcionMensual = async (inscripcion, data) => {
  await validarInscripcionMensual(data, inscripcion.id);

  const hoy = new Date().toISOString().slice(0, 10);
  const estadosCancelacion = ["CANCELADA", "SUSPENDIDA"];

  const estadoCambia = data.estado && estadosCancelacion.includes(data.estado);
  const fechasCambian = data.periodo_inicio !== undefined || data.periodo_fin !== undefined;
  const claseCambia = data.clase_id !== undefined && data.clase_id !== inscripcion.clase_id;

  if (estadoCambia || fechasCambian || claseCambia) {
    await ReservaClase.destroy({
      where: {
        origen: "MENSUAL",
        origen_id: inscripcion.id,
        fecha_exacta: { [Op.gte]: hoy },
      },
    });

    if (!estadoCambia && (fechasCambian || claseCambia)) {
      const claseIdFinal = data.clase_id ?? inscripcion.clase_id;
      const clase = await Clase.findByPk(claseIdFinal);
      if (!clase) throw httpError(404, "La clase no existe");

      const inicioFinal = data.periodo_inicio ?? inscripcion.periodo_inicio;
      const finFinal = data.periodo_fin ?? inscripcion.periodo_fin;

      const inicioEfectivo = inicioFinal < hoy ? hoy : inicioFinal;

      const fechas = fechasDelMesPorDia(clase.dia_semana, inicioEfectivo, finFinal);
      if (fechas.length > 0) {
        const reservas = fechas.map((fecha_exacta) => ({
          cliente_email: inscripcion.cliente_email,
          clase_id: claseIdFinal,
          fecha_exacta,
          origen: "MENSUAL",
          origen_id: inscripcion.id,
          estado: "ACTIVA",
          asistio: false,
        }));
        await ReservaClase.bulkCreate(reservas);
      }
    }
  }

  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
};
