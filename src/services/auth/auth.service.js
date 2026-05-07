const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Usuario, Rol } = require("../../../db");
const { calcularEdad } = require("../../utils/fechas");
const httpError = require("../../utils/httpError");

const enviarEmailConfirmacion = async (email, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const urlConfirmacion = `${process.env.APP_URL}/api/auth/confirmar/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
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

  const rolCliente = await Rol.findOne({ where: { nombre: "cliente" } });

  const tokenConfirmacion = crypto.randomBytes(32).toString("hex");
  const tokenExpiracion = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await Usuario.create({
    nombre,
    apellido,
    dni,
    email,
    genero,
    fechaNacimiento,
    telefono,
    fichaMedica,
    password,
    tokenConfirmacion,
    tokenExpiracion,
    activo: false,
    rol_id: rolCliente?.id,
  });

  await enviarEmailConfirmacion(email, tokenConfirmacion);

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

module.exports = { registrarCliente, confirmarCuenta };
