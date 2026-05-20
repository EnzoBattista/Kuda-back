const { Sala } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarSala = (data) => {
  if (data.identificador !== undefined && !data.identificador.trim()) {
    throw httpError(400, "El identificador de la sala no puede estar vacío");
  }
  if (data.cupo !== undefined && data.cupo <= 0) {
    throw httpError(400, "el cupo debe ser mayor a 0");
  }
};

const crearSala = async (data) => {
  validarSala(data);
  return Sala.create(data);
};

const actualizarSala = async (sala, data) => {
  validarSala(data);
  return sala.update(data);
};

module.exports = {
  validarSala,
  crearSala,
  actualizarSala,
};
