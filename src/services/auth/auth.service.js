const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const { Usuario, Cliente, Rol, conn } = require("../../../db");
const { ROLES } = require("../../constants/roles");
const { calcularEdad } = require("../../utils/fechas");
const httpError = require("../../utils/httpError");
const { validarUsuario } = require("../acceso/usuarios.service");

const enviarEmailConfirmacion = async (email, token) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY no está configurada");
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM no está configurado (remitente verificado en SendGrid)");
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const urlConfirmacion = `${process.env.APP_URL}/api/auth/confirmar/${token}`;

  await sgMail.send({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Confirmación de registro - Kuda",
    html: `
      <h2>Bienvenido a Kuda</h2>
      <p>Haga clic en el siguiente enlace para confirmar su registro.
         El enlace expira en 48 horas:</p>
      <a href="${urlConfirmacion}">${urlConfirmacion}</a>
    `,
  });
};

const registrarCliente = async ({
  nombre,
  apellido,
  dni,
  email,
  genero,
  fechaNacimiento,
  telefono,
  fichaMedica,
  password,
  confirmPassword,
}) => {
  if (password !== confirmPassword) {
    throw httpError(400, "Registro fallido - Las contraseñas no coinciden.");
  }
  if (password.length < 8) {
    throw httpError(400, "Registro fallido - La contraseña debe tener al menos 8 caracteres.");
  }
  if (calcularEdad(fechaNacimiento) <= 14) {
    throw httpError(400, "Registro fallido - Se debe ser mayor de 14 años.");
  }

  const emailExistente = await Usuario.findOne({ where: { email } });
  if (emailExistente) {
    throw httpError(400, "Registro fallido - El email ya se encuentra registrado.");
  }

  const rolCliente = await Rol.findOne({ where: { nombre: ROLES.CLIENTE } });
  if (!rolCliente) {
    throw httpError(500, "Rol CLIENTE no existe. Ejecutar seeders.");
  }

  const tokenConfirmacion = crypto.randomBytes(32).toString("hex");
  const tokenExpiracion = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const usuarioData = {
    email,
    dni,
    nombre,
    apellido,
    telefono,
    password,
    tokenConfirmacion,
    tokenExpiracion,
    activo: false,
    rol_id: rolCliente.id,
  };

  validarUsuario(usuarioData);

  await conn.transaction(async (t) => {
    await Usuario.create(usuarioData, { transaction: t });
    await Cliente.create(
      { usuario_email: email, genero, fechaNacimiento, fichaMedica },
      { transaction: t }
    );

    try {
      await enviarEmailConfirmacion(email, tokenConfirmacion);
    } catch (emailError) {
      console.error(
        "[auth.register] Falló el envío del email de confirmación:",
        emailError.message
      );
      throw httpError(
        503,
        "El registro no pudo completarse: el servicio de email no está disponible. Intente más tarde."
      );
    }
  });

  return {
    message:
      "Se ha enviado un enlace de confirmación a su casilla de email. Tiene 48hs para confirmar su registro.",
  };
};

const confirmarCuenta = async (token) => {
  const usuario = await Usuario.findOne({ where: { tokenConfirmacion: token } });

  if (!usuario || usuario.activo) {
    throw httpError(400, "El enlace de confirmación es inválido");
  }
  if (new Date() > usuario.tokenExpiracion) {
    throw httpError(400, "El enlace de confirmación ha expirado");
  }

  await usuario.update({
    activo: true,
    tokenConfirmacion: null,
    tokenExpiracion: null,
  });

  return { message: "Usted ha sido registrado correctamente" };
};

const cambiarPassword = async (email, { passwordActual, passwordNueva, confirmPassword }) => {
  if (!passwordActual || !passwordNueva) {
    throw httpError(400, "Debe indicar contraseña actual y nueva");
  }
  if (passwordNueva !== confirmPassword) {
    throw httpError(400, "La nueva contraseña y su confirmación no coinciden");
  }
  if (passwordNueva.length < 8) {
    throw httpError(400, "La nueva contraseña debe tener al menos 8 caracteres");
  }
  if (passwordActual === passwordNueva) {
    throw httpError(400, "La nueva contraseña debe ser distinta a la actual");
  }

  const usuario = await Usuario.findByPk(email);
  if (!usuario) {
    throw httpError(404, "Usuario no encontrado");
  }

  const actualValida = await usuario.verificarPassword(passwordActual);
  if (!actualValida) {
    throw httpError(400, "La contraseña actual es incorrecta");
  }

  usuario.password = passwordNueva;
  await usuario.save();

  return { message: "Contraseña actualizada correctamente" };
};

module.exports = { registrarCliente, confirmarCuenta, cambiarPassword };
