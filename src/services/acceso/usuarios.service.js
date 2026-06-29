const { Op } = require("sequelize");
const { Usuario, InscripcionMensual } = require("../../../db");
const httpError = require("../../utils/httpError");

const { ROLES } = require("../../constants/roles");

const validarUsuario = (data) => {
  if (data.email !== undefined) {
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
  
  let usuarioReusar = null;

  if (data.email) {
    const emailExistente = await Usuario.findOne({ where: { email: data.email } });
    if (emailExistente) {
      if (!emailExistente.activo && !emailExistente.tokenConfirmacion) {
        usuarioReusar = emailExistente;
      } else {
        throw httpError(400, "El email ingresado ya se encuentra registrado");
      }
    }
  }

  if (data.dni) {
    const usuariosDni = await Usuario.findAll({ where: { dni: data.dni } });
    const conflictoDni = usuariosDni.find(u => (u.activo || u.tokenConfirmacion) && (!usuarioReusar || u.email !== usuarioReusar.email));
    if (conflictoDni) {
      throw httpError(400, "El DNI ingresado ya se encuentra registrado");
    }
  }

  if (usuarioReusar) {
    return usuarioReusar.update(data);
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

    const usuariosDni = await Usuario.findAll({ where: { dni: data.dni } });
    const conflictoDni = usuariosDni.find(u => (u.activo || u.tokenConfirmacion) && u.email !== usuario.email);
    if (conflictoDni) throw httpError(400, "El DNI ingresado ya se encuentra registrado");
  }
  return usuario.update(data);
};

const darDeBajaUsuario = async (email) => {
  const usuario = await Usuario.findByPk(email);
  if (!usuario) throw httpError(404, "Usuario no encontrado");

  // Estado ELIMINADO = inactivo y sin token de confirmación pendiente. Solo
  // rechazamos si ya está eliminado; un usuario PENDIENTE (inactivo pero con
  // token) sí se puede dar de baja para que pase a ELIMINADO.
  const yaEliminado = !usuario.activo && !usuario.tokenConfirmacion;
  if (yaEliminado) throw httpError(410, "Usuario ya dado de baja");

  // Dejarlo en ELIMINADO: inactivo y sin token pendiente (cubre tanto a los
  // ACTIVO como a los PENDIENTE).
  usuario.activo = false;
  usuario.tokenConfirmacion = null;
  usuario.tokenExpiracion = null;
  // Rename the email to allow new registrations with the same email
  const originalEmail = usuario.email;
  const suffix = `_deleted_${Date.now()}`;
  usuario.email = `${originalEmail}${suffix}`;
  await usuario.save();

  // Cancelar las inscripciones mensuales activas del usuario (si es cliente)
  await InscripcionMensual.update(
    { estado: "CANCELADA" },
    {
      where: {
        cliente_email: usuario.email, // Use the new email for the cascade update check, though cascade might have already handled it
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] },
      },
    }
  );

  const { ReservaClase } = require("../../../db");
  await ReservaClase.destroy({
    where: {
      cliente_email: usuario.email,
      estado: "ACTIVA",
    }
  });

  return usuario;
};

module.exports = {
  validarUsuario,
  crearUsuario,
  actualizarUsuario,
  darDeBajaUsuario,
};
