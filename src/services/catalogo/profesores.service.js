const { Profesor } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarProfesor = (data) => {
  if (data.nombre !== undefined && !data.nombre.trim()) {
    throw httpError(400, "El nombre no puede estar vacío");
  }
  if (data.apellido !== undefined && !data.apellido.trim()) {
    throw httpError(400, "El apellido no puede estar vacío");
  }
  if (data.dni !== undefined && !data.dni.trim()) {
    throw httpError(400, "El DNI no puede estar vacío");
  }
  if (data.telefono !== undefined && !data.telefono.trim()) {
    throw httpError(400, "El teléfono no puede estar vacío");
  }
  if (data.email !== undefined && !data.email.trim()) {
    throw httpError(400, "El email no puede estar vacío");
  }
};

const crearProfesor = async (data) => {
  validarProfesor(data);
  return Profesor.create(data);
};

const actualizarProfesor = async (profesor, data) => {
  validarProfesor(data);
  return profesor.update(data);
};

module.exports = {
  validarProfesor,
  crearProfesor,
  actualizarProfesor,
};
