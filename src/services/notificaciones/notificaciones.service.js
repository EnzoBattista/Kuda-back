const sgMail = require("@sendgrid/mail");
const { Cliente, Usuario } = require("../../../db");
const httpError = require("../../utils/httpError");

const CANALES_DEFAULT = {
  email: true,
  sms: false,
  push: false,
  recordatorios_clases: true,
  promociones: false,
  recordatorio_pago_dia: null,
};

const normalizarCanales = (raw) => ({
  ...CANALES_DEFAULT,
  ...(raw && typeof raw === "object" ? raw : {}),
});

const obtenerPreferencias = async (email) => {
  const cliente = await Cliente.findByPk(email, {
    include: [{ model: Usuario, as: "usuario", attributes: ["email", "nombre", "apellido"] }],
  });
  if (!cliente) throw httpError(404, "Cliente no encontrado");

  return {
    notificaciones_activas: cliente.notificaciones_activas,
    canales_notificacion: normalizarCanales(cliente.canales_notificacion),
  };
};

const actualizarPreferencias = async (email, body) => {
  const cliente = await Cliente.findByPk(email);
  if (!cliente) throw httpError(404, "Cliente no encontrado");

  const prevActivo = cliente.notificaciones_activas;
  const prevCanales = normalizarCanales(cliente.canales_notificacion);

  const { notificaciones_activas, canales_notificacion, recordatorio_pago_dia } = body;

  const nuevosCanales = {
    ...prevCanales,
    ...(canales_notificacion && typeof canales_notificacion === "object" ? canales_notificacion : {}),
  };

  if (recordatorio_pago_dia !== undefined) {
    if (recordatorio_pago_dia !== null && (recordatorio_pago_dia < 0 || recordatorio_pago_dia > 10)) {
      throw httpError(400, "El recordatorio debe estar dentro de los 10 días de gracia para pagar");
    }
    nuevosCanales.recordatorio_pago_dia = recordatorio_pago_dia;
  }

  const nuevoActivo =
    notificaciones_activas !== undefined ? Boolean(notificaciones_activas) : prevActivo;

  await cliente.update({
    notificaciones_activas: nuevoActivo,
    canales_notificacion: nuevosCanales,
  });

  let message = "Preferencias de notificaciones actualizadas";
  if (nuevoActivo && !prevActivo) message = "Notificaciones activadas";
  else if (!nuevoActivo && prevActivo) message = "Notificaciones desactivadas";
  else if (
    recordatorio_pago_dia !== undefined &&
    recordatorio_pago_dia !== prevCanales.recordatorio_pago_dia
  ) {
    message = "Recordatorio modificado";
  }

  return {
    message,
    notificaciones_activas: nuevoActivo,
    canales_notificacion: nuevosCanales,
  };
};

const enviarNotificacionManual = async ({ cliente_email, asunto, mensaje }) => {
  if (!cliente_email?.trim() || !asunto?.trim() || !mensaje?.trim()) {
    throw httpError(400, "cliente_email, asunto y mensaje son requeridos");
  }

  const cliente = await Cliente.findByPk(cliente_email.trim(), {
    include: [{ model: Usuario, as: "usuario", attributes: ["nombre", "apellido", "email"] }],
  });

  if (!cliente?.usuario) throw httpError(404, "Cliente no encontrado");

  if (!cliente.notificaciones_activas) {
    throw httpError(400, "El cliente tiene las notificaciones desactivadas");
  }

  const canales = normalizarCanales(cliente.canales_notificacion);
  if (!canales.email) {
    throw httpError(400, "El cliente no tiene habilitado el canal de email");
  }

  const nombre = `${cliente.usuario.nombre} ${cliente.usuario.apellido}`.trim();

  if (process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    try {
      await sgMail.send({
        to: cliente_email,
        from: process.env.EMAIL_FROM,
        subject: asunto.trim(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #003366;">Hola, ${nombre}</h2>
            <p>${mensaje.trim().replace(/\n/g, "<br>")}</p>
            <hr>
            <p style="font-size: 12px; color: #666;">CEF Actividades — Centro de bienestar</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[notificaciones.manual] Error SendGrid:", err.message);
      throw httpError(502, "No se pudo enviar la notificación por email");
    }
  } else {
    console.log("[notificaciones.manual] Simulación envío →", {
      to: cliente_email,
      asunto,
      mensaje,
    });
  }

  return { message: "Notificación enviada correctamente al cliente" };
};

module.exports = {
  CANALES_DEFAULT,
  normalizarCanales,
  obtenerPreferencias,
  actualizarPreferencias,
  enviarNotificacionManual,
};
