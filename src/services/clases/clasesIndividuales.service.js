const { PagoClaseIndividual } = require("../../../db");
const httpError = require("../../utils/httpError");

const MODALIDADES = ["COMPLETO", "SEÑA"];
const ESTADOS_SEÑA = ["PENDIENTE", "COMPLETADA", "VENCIDA"];

const validarPagoClaseIndividual = (data) => {
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

const crearPagoClaseIndividual = async (data) => {
  validarPagoClaseIndividual(data);
  return PagoClaseIndividual.create(data);
};

const actualizarPagoClaseIndividual = async (pago, data) => {
  validarPagoClaseIndividual(data);
  return pago.update(data);
};

module.exports = {
  validarPagoClaseIndividual,
  crearPagoClaseIndividual,
  actualizarPagoClaseIndividual,
};
