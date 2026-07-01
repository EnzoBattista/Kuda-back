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
      const isEliminado = !emailExistente.activo && !emailExistente.tokenConfirmacion;
      const isPendienteExpirado = !emailExistente.activo && emailExistente.tokenConfirmacion && emailExistente.tokenExpiracion < new Date();
      if (isEliminado || isPendienteExpirado) {
        usuarioReusar = emailExistente;
      } else {
        throw httpError(400, "El email ingresado ya se encuentra registrado");
      }
    }
  }

  if (data.dni) {
    const usuariosDni = await Usuario.findAll({ where: { dni: data.dni } });
    const conflictoDni = usuariosDni.find(u => {
      const isPendienteExpirado = !u.activo && u.tokenConfirmacion && u.tokenExpiracion < new Date();
      const isActiveOrPending = u.activo || (u.tokenConfirmacion && !isPendienteExpirado);
      return isActiveOrPending && (!usuarioReusar || u.email !== usuarioReusar.email);
    });
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
    const conflictoDni = usuariosDni.find(u => {
      const isPendienteExpirado = !u.activo && u.tokenConfirmacion && u.tokenExpiracion < new Date();
      const isActiveOrPending = u.activo || (u.tokenConfirmacion && !isPendienteExpirado);
      return isActiveOrPending && u.email !== usuario.email;
    });
    if (conflictoDni) throw httpError(400, "El DNI ingresado ya se encuentra registrado");
  }
  return usuario.update(data);
};

const darDeBajaUsuario = async (email) => {
  const usuario = await Usuario.findByPk(email);
  if (!usuario) throw httpError(404, "Usuario no encontrado");

  // Verificamos si ya está eliminado fijándonos si su email ya tiene la marca
  const yaEliminado = usuario.email.includes("_deleted_");
  if (yaEliminado) throw httpError(410, "Usuario ya dado de baja");

  const originalEmail = usuario.email;
  const suffix = `_deleted_${Date.now()}`;
  const newEmail = `${originalEmail}${suffix}`;

  await Usuario.update(
    {
      activo: false,
      tokenConfirmacion: null,
      tokenExpiracion: null,
      email: newEmail,
    },
    { where: { email: originalEmail } }
  );

  // Actualizar la instancia local por si se usa después
  usuario.email = newEmail;
  usuario.activo = false;
  usuario.tokenConfirmacion = null;
  usuario.tokenExpiracion = null;

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
