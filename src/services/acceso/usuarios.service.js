const { Usuario } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarUsuario = (data) => {
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) throw httpError(400, "El email no tiene un formato válido");
    if (!data.email.trim()) throw httpError(400, "El email no puede estar vacío");
  }
  if (data.dni !== undefined && !data.dni.trim()) throw httpError(400, "El DNI no puede estar vacío");
  if (data.nombre !== undefined && !data.nombre.trim()) throw httpError(400, "El nombre no puede estar vacío");
  if (data.apellido !== undefined && !data.apellido.trim()) throw httpError(400, "El apellido no puede estar vacío");
  if (data.password !== undefined && !data.password.trim()) throw httpError(400, "La contraseña no puede estar vacía");
};

const crearUsuario = async (data) => {
  validarUsuario(data);
  return Usuario.create(data);
};

const actualizarUsuario = async (usuario, data) => {
  validarUsuario(data);
  return usuario.update(data);
};

module.exports = {
  validarUsuario,
  crearUsuario,
  actualizarUsuario,
};
