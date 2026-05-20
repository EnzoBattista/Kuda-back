const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const { Usuario, Cliente, Rol, conn } = require("../../../db");
const { ROLES } = require("../../constants/roles");
const { calcularEdad } = require("../../utils/fechas");
const httpError = require("../../utils/httpError");
const { validarUsuario } = require("../acceso/usuarios.service");

const urlLogo = "https://raw.githubusercontent.com/EnzoBattista/Kuda-front/refs/heads/main/public/Logo.png";

const enviarEmailConfirmacion = async (email, nombre, token) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY no está configurada");
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM no está configurado (remitente verificado en SendGrid)");
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL;
  const urlConfirmacion = `${baseUrl}/confirmar/${token}`;


  await sgMail.send({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Confirmación de registro - Kuda",
    html:
      `
       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #003366;">
            <img src="${urlLogo}" alt="CEF Logo" style="max-width: 150px;">
        </div>

        <div style="padding: 30px; text-align: center;">
            <h2 style="color: #003366;">¡Hola, ${nombre}!</h2>
            <p>Gracias por unirte a <strong>CEF Actividades</strong>. Para comenzar, necesitamos verificar tu dirección de correo electrónico.</p>
            
            <div style="margin: 30px 0;">
                <a href="${urlConfirmacion}" 
                   style="background-color: #E30613; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                   VERIFICAR MI CUENTA
                </a>
            </div>

            <p style="font-size: 0.9em; color: #666;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${urlConfirmacion}" style="color: #003366;">${urlConfirmacion}</a>
            </p>
        </div>

        <div style="background-color: #003366; color: #ffffff; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0; font-weight: bold;">CEF Actividades</p>
            <p style="margin: 5px 0;">&copy; 2026 Todos los derechos reservados.</p>
            <div style="margin-top: 10px;">
            </div>
        </div>
    </div>
    `,
  });
};

const enviarEmailRecuperacion = async (email, nombre, token) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY no está configurada");
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM no está configurado (remitente verificado en SendGrid)");
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // La URL del frontend que armará el equipo en el futuro (usamos FRONTEND_URL o APP_URL como fallback)
  const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL;
  const urlRecuperacion = `${baseUrl}/recuperar-password/${token}`;

  await sgMail.send({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Recuperación de contraseña - Kuda",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #003366;">
            <img src=${urlLogo} alt="Kuda Logo" style="max-width: 150px;">
        </div>

        <div style="padding: 30px; text-align: center;">
            <h2 style="color: #003366;">Hola, ${nombre}</h2>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
            
            <div style="margin: 30px 0;">
                <a href="${urlRecuperacion}" 
                   style="background-color: #E30613; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                   RESTABLECER CONTRASEÑA
                </a>
            </div>

            <p style="font-size: 0.9em; color: #666;">
                Si no solicitaste este cambio, puedes ignorar este correo. El enlace expirará en 1 hora.<br><br>
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${urlRecuperacion}" style="color: #003366;">${urlRecuperacion}</a>
            </p>
        </div>

        <div style="background-color: #003366; color: #ffffff; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0; font-weight: bold;">CEF Actividades</p>
            <p style="margin: 5px 0;">&copy; 2026 Todos los derechos reservados.</p>
        </div>
      </div>
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
      await enviarEmailConfirmacion(email, nombre, tokenConfirmacion);
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
  return conn.transaction(async (transaction) => {
    const usuario = await Usuario.findOne({ where: { tokenConfirmacion: token }, transaction });

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
    }, { transaction });

    return { message: "Usted ha sido registrado correctamente" };
  });
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

  return conn.transaction(async (transaction) => {
    const usuario = await Usuario.findByPk(email, { transaction });
    if (!usuario) {
      throw httpError(404, "Usuario no encontrado");
    }

    const actualValida = await usuario.verificarPassword(passwordActual);
    if (!actualValida) {
      throw httpError(400, "La contraseña actual es incorrecta");
    }

    usuario.password = passwordNueva;
    await usuario.save({ transaction });

    return { message: "Contraseña actualizada correctamente" };
  });
};

const solicitarRecuperacionPassword = async (email) => {
  if (!email) throw httpError(400, "Debe proveer un email");

  const usuario = await Usuario.findByPk(email);
  if (!usuario) {
    throw httpError(404, "Si el email existe en el sistema, recibirás un enlace de recuperación");
  }

  if (!usuario.activo) {
    throw httpError(403, "La cuenta no está activa. Confirma tu registro primero.");
  }

  // Generar un JWT stateless de un solo uso.
  // Al agregar el password actual al secreto, cuando el password cambie, el token quedará invalidado automáticamente.
  const secret = process.env.JWT_SECRET + usuario.password;
  const tokenRecuperacion = jwt.sign({ email: usuario.email }, secret, { expiresIn: "1h" });

  try {
    await enviarEmailRecuperacion(email, usuario.nombre, tokenRecuperacion);
  } catch (emailError) {
    console.error("[auth.recover] Falló el envío del email de recuperación:", emailError.message);
    throw httpError(503, "No se pudo enviar el correo de recuperación. Intenta más tarde.");
  }

  return { message: "Se ha enviado un enlace de recuperación a tu casilla de email" };
};

const resetearPassword = async (token, passwordNueva, confirmPassword) => {
  if (!token || !passwordNueva || !confirmPassword) {
    throw httpError(400, "Faltan datos requeridos (token, nueva contraseña, confirmación)");
  }
  if (passwordNueva !== confirmPassword) {
    throw httpError(400, "La nueva contraseña y su confirmación no coinciden");
  }
  if (passwordNueva.length < 8) {
    throw httpError(400, "La nueva contraseña debe tener al menos 8 caracteres");
  }

  // Decodificar sin verificar para obtener el email
  const payloadDecodificado = jwt.decode(token);
  if (!payloadDecodificado || !payloadDecodificado.email) {
    throw httpError(400, "El enlace de recuperación es inválido o incorrecto");
  }

  return conn.transaction(async (transaction) => {
    const usuario = await Usuario.findByPk(payloadDecodificado.email, { transaction });
    if (!usuario) {
      throw httpError(400, "El enlace de recuperación es inválido o incorrecto");
    }

    // Verificar la firma asegurando que la contraseña no haya cambiado desde que se generó el token
    const secret = process.env.JWT_SECRET + usuario.password;
    try {
      jwt.verify(token, secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw httpError(400, "El enlace de recuperación ha expirado. Solicita uno nuevo.");
      }
      throw httpError(400, "El enlace de recuperación es inválido o ya ha sido utilizado.");
    }

    usuario.password = passwordNueva;
    await usuario.save({ transaction });

    return { message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión." };
  });
};

module.exports = {
  registrarCliente,
  confirmarCuenta,
  cambiarPassword,
  solicitarRecuperacionPassword,
  resetearPassword
};
