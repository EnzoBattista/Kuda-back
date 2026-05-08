const { Actividad } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarActividad = (data) => {
  if (data.nombre !== undefined && !data.nombre.trim()) {
    throw httpError(400, "El nombre de la actividad no puede estar vacío");
  }
};

const crearActividad = async (data) => {
  validarActividad(data);
  return Actividad.create(data);
};

const actualizarActividad = async (actividad, data) => {
  validarActividad(data);
  return actividad.update(data);
};

module.exports = {
  validarActividad,
  crearActividad,
  actualizarActividad,
};
