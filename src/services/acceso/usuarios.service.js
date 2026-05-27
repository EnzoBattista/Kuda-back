const { Op } = require("sequelize");
const { Usuario, InscripcionMensual } = require("../../../db");
const httpError = require("../../utils/httpError");

const { ROLES } = require("../../constants/roles");

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
  if (data.telefono !== undefined) {
    const telRegex = /^[0-9]+$/;
    if (!telRegex.test(data.telefono)) throw httpError(400, "El teléfono debe contener únicamente números");
  }
};

const crearUsuario = async (data) => {
  validarUsuario(data);
  
  if (data.email) {
    const emailExistente = await Usuario.findOne({ where: { email: data.email } });
    if (emailExistente) throw httpError(400, "El email ingresado ya se encuentra registrado");
  }

  if (data.dni) {
    const dniExistente = await Usuario.findOne({ where: { dni: data.dni } });
    if (dniExistente) throw httpError(400, "El DNI ingresado ya se encuentra registrado");
  }

  return Usuario.create(data);
};

const actualizarUsuario = async (usuario, data) => {
  validarUsuario(data);
  
  if (data.dni && data.dni !== usuario.dni) {
    // Si es administrativo, el DNI es inmutable
    const rol = await usuario.getRol();
    if (rol && (rol.nombre === ROLES.RECEPCIONISTA || rol.nombre === ROLES.DUEÑO)) {
      throw httpError(400, "El DNI de los administrativos no puede ser modificado");
    }

    const dniExistente = await Usuario.findOne({ where: { dni: data.dni } });
    if (dniExistente) throw httpError(400, "El DNI ingresado ya se encuentra registrado");
  }
  return usuario.update(data);
};

const darDeBajaUsuario = async (email) => {
  const usuario = await Usuario.findByPk(email);
  if (!usuario) throw httpError(404, "Usuario no encontrado");
  if (!usuario.activo) throw httpError(410, "Usuario ya dado de baja");

  usuario.activo = false;
  await usuario.save();

  // Cancelar las inscripciones mensuales activas del usuario (si es cliente)
  await InscripcionMensual.update(
    { estado: "CANCELADA" },
    {
      where: {
        cliente_email: email,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA", "PENDIENTE"] },
      },
    }
  );

  return usuario;
};

module.exports = {
  validarUsuario,
  crearUsuario,
  actualizarUsuario,
  darDeBajaUsuario,
};
