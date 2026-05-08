const { Mensualidad } = require("../../../db");
const httpError = require("../../utils/httpError");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

const validarMensualidad = (data) => {
  if (data.estado !== undefined && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de mensualidad no válido");
  }
  if (data.periodo_inicio && data.periodo_fin && data.periodo_fin <= data.periodo_inicio) {
    throw httpError(400, "periodo_fin debe ser posterior a periodo_inicio");
  }
};

const crearMensualidad = async (data) => {
  validarMensualidad(data);
  return Mensualidad.create(data);
};

const actualizarMensualidad = async (mensualidad, data) => {
  validarMensualidad(data);
  return mensualidad.update(data);
};

module.exports = {
  validarMensualidad,
  crearMensualidad,
  actualizarMensualidad,
};
