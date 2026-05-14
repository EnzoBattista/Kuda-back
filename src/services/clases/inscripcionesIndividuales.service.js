const { InscripcionIndividual, ReservaClase, CancelacionClase } = require("../../../db");
const httpError = require("../../utils/httpError");

const MODALIDADES = ["COMPLETO", "SEÑA"];
const ESTADOS_SEÑA = ["PENDIENTE", "COMPLETADA", "VENCIDA"];

const validarInscripcionIndividual = (data) => {
  if (data.modalidad !== undefined) {
    if (!MODALIDADES.includes(data.modalidad)) {
      throw httpError(400, "Modalidad no válida");
    }
    if (data.modalidad === "SEÑA") {
      if (!data.estado_seña || !data.vencimiento_seña) {
        throw httpError(400, "Una seña requiere estado_seña y vencimiento_seña");
      }
    } else if (data.modalidad === "COMPLETO") {
      if (data.estado_seña || data.vencimiento_seña) {
        throw httpError(400, "Pago COMPLETO no debe tener datos de seña");
      }
    }
  }

  if (data.estado_seña !== undefined && data.estado_seña !== null) {
    if (!ESTADOS_SEÑA.includes(data.estado_seña)) {
      throw httpError(400, "Estado de seña no válido");
    }
  }
};

/**
 * Valida las reglas de negocio de HU47 antes de crear una inscripción individual:
 *  1. La fecha de la clase no debe estar cancelada (CancelacionClase).
 *  2. La clase debe tener cupo disponible para esa fecha (ReservaClase ACTIVA).
 * @param {number} clase_id
 * @param {string} fecha - "YYYY-MM-DD"
 */
const validarDisponibilidadFecha = async (clase_id, fecha) => {
  // 1. Verificar que esa ocurrencia de la clase no fue cancelada
  const cancelacion = await CancelacionClase.findOne({
    where: { clase_id, fecha },
  });
  if (cancelacion) {
    throw httpError(400, `La clase fue cancelada para la fecha ${fecha}. Motivo: ${cancelacion.motivo || "sin especificar"}`);
  }

  // 2. Verificar cupo disponible contando ReservaClase ACTIVA para esa fecha
  const { Clase } = require("../../../db");
  const clase = await Clase.findByPk(clase_id);
  if (!clase) throw httpError(404, "La clase no existe");

  const ocupacion = await ReservaClase.count({
    where: { clase_id, fecha_exacta: fecha, estado: "ACTIVA" },
  });

  if (ocupacion >= clase.cupo) {
    throw httpError(400, "No hay cupo disponible para esta clase en la fecha solicitada");
  }
};

/**
 * Crea la InscripcionIndividual y genera automáticamente la
 * ReservaClase concreta para la fecha de la clase.
 */
const crearInscripcionIndividual = async (data) => {
  validarInscripcionIndividual(data);
  await validarDisponibilidadFecha(data.clase_id, data.fecha);

  const inscripcion = await InscripcionIndividual.create(data);

  // Generar la reserva concreta para la fecha de esta clase individual
  await ReservaClase.create({
    cliente_email: data.cliente_email,
    clase_id: data.clase_id,
    fecha_exacta: data.fecha,
    origen: "INDIVIDUAL",
    origen_id: inscripcion.id,
    estado: "ACTIVA",
    asistio: false,
  });

  return inscripcion;
};

const actualizarInscripcionIndividual = async (inscripcion, data) => {
  validarInscripcionIndividual(data);
  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionIndividual,
  validarDisponibilidadFecha,
  crearInscripcionIndividual,
  actualizarInscripcionIndividual,
};
