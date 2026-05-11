const { InscripcionIndividual } = require("../../../db");
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

const crearInscripcionIndividual = async (data) => {
  validarInscripcionIndividual(data);
  return InscripcionIndividual.create(data);
};

const actualizarInscripcionIndividual = async (inscripcion, data) => {
  validarInscripcionIndividual(data);
  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionIndividual,
  crearInscripcionIndividual,
  actualizarInscripcionIndividual,
};
