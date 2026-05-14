const { Op } = require("sequelize");
const { InscripcionMensual, Clase, ReservaClase } = require("../../../db");
const httpError = require("../../utils/httpError");
const { fechasDelMesPorDia } = require("../../utils/fechas");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

/**
 * Valida las reglas de negocio de una inscripción mensual antes de crear o actualizar.
 * Devuelve el objeto Clase para reutilizarlo sin una segunda query.
 * @param {object} data
 * @param {number|null} inscripcionIdActual - ID a excluir en validación de duplicados (para updates)
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

  // 3. No puede tener otra inscripción VIGENTE o EN_GRACIA para la misma actividad
  if (data.cliente_email && data.actividad_id) {
    const whereInscripcion = {
      cliente_email: data.cliente_email,
      actividad_id: data.actividad_id,
      estado: ["VIGENTE", "EN_GRACIA"],
    };
    if (inscripcionIdActual) {
      whereInscripcion.id = { [Op.ne]: inscripcionIdActual };
    }
    const inscripcionVigente = await InscripcionMensual.findOne({ where: whereInscripcion });
    if (inscripcionVigente) {
      throw httpError(400, "El cliente ya tiene otra inscripción mensual vigente para esta actividad");
    }
  }

  // 4. La clase debe existir y estar activa
  const clase = await Clase.findByPk(data.clase_id);
  if (!clase) {
    throw httpError(404, "La clase no existe");
  }
  if (!clase.activa) {
    throw httpError(400, "La clase seleccionada se encuentra inactiva o dada de baja");
  }

  // 5. Cupo disponible (se cuenta sobre ReservaClase, la tabla operativa)
  const ocupacionActual = await ReservaClase.count({
    where: {
      clase_id: data.clase_id,
      estado: "ACTIVA",
    },
  });
  if (ocupacionActual >= clase.cupo) {
    throw httpError(400, "No hay cupo disponible para esta clase");
  }

  return clase; // Se reutiliza en crearInscripcionMensual para evitar doble query
};

/**
 * Crea la InscripcionMensual y genera automáticamente todas las
 * ReservaClase concretas para cada fecha del período.
 */
const crearInscripcionMensual = async (data) => {
  const clase = await validarInscripcionMensual(data);

  const inscripcion = await InscripcionMensual.create(data);

  // Generar reservas concretas: una por cada fecha que coincida con el día de la clase
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
 * No regenera reservas (eso será parte de la Fase 2 de refactor).
 */
const actualizarInscripcionMensual = async (inscripcion, data) => {
  await validarInscripcionMensual(data, inscripcion.id);
  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
};
