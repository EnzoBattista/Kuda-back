const sgMail = require("@sendgrid/mail");

/**
 * Notifica al primer cliente de la lista de espera que se liberó un cupo.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.nombre
 * @param {string} params.nombreClase
 * @param {"MENSUAL"|"INDIVIDUAL"} params.tipo
 * @param {string|null} params.fechaExacta - Solo para tipo INDIVIDUAL
 * @param {number} params.horasLimite
 */
const notificarCupoDisponible = async ({ email, nombre, nombreClase, tipo, fechaExacta, horasLimite = 6 }) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
    console.warn("[listaEspera.email] SendGrid no configurado, se omite el envío.");
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const esIndividual = tipo === "INDIVIDUAL";
  const detalleClase = esIndividual && fechaExacta
    ? `un lugar para la clase <strong>${nombreClase}</strong> del día <strong>${fechaExacta}</strong>`
    : `un lugar fijo en la clase <strong>${nombreClase}</strong> (membresía mensual)`;

  const instrucciones = esIndividual
    ? "Podés optar por pagar el total o dejar una seña del 50%."
    : "Deberás abonar tu membresía mensual completa para confirmar el lugar.";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
      <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #003366;">
        <img src="https://i.ibb.co/DgwmFzK8/Logo.png" alt="Kuda Logo" style="max-width: 150px;">
      </div>

      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #003366;">¡Hola, ${nombre}! Se liberó un cupo 🎉</h2>
        <p>Tenés buenas noticias: se liberó ${detalleClase} para la que estabas en lista de espera.</p>

        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
          <strong>⏰ Tenés <span style="color: #E30613;">${horasLimite} horas</span> para confirmar tu lugar.</strong><br>
          ${instrucciones}<br>
          Si no realizás el pago en ese tiempo, el lugar pasará al siguiente en la lista.
        </div>

        <p style="font-size: 0.9em; color: #666;">
          Si ya no te interesa el lugar, por favor comunicate con recepción para que podamos avisarle al siguiente.
        </p>
      </div>

      <div style="background-color: #003366; color: #ffffff; padding: 20px; text-align: center; font-size: 12px;">
        <p style="margin: 0; font-weight: bold;">CEF Actividades</p>
        <p style="margin: 5px 0;">&copy; 2026 Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: `¡Se liberó un cupo en ${nombreClase}! - Kuda`,
      html,
    });
  } catch (err) {
    // No propagamos el error para no interrumpir el flujo principal de negocio.
    console.error("[listaEspera.email] Error al enviar notificación:", err.message);
  }
};

/**
 * Notifica al cliente que su tiempo para confirmar el lugar expiró.
 */
const notificarExpiracion = async ({ email, nombre, nombreClase }) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) return;

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    await sgMail.send({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: `Tu tiempo para reservar en ${nombreClase} expiró - Kuda`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; text-align: center;">
          <h2 style="color: #003366;">Hola, ${nombre}</h2>
          <p>Lamentablemente, el tiempo para confirmar tu lugar en <strong>${nombreClase}</strong> ha vencido.</p>
          <p>Si seguís interesado/a, podés volver a anotarte en la lista de espera desde la aplicación.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[listaEspera.email] Error al enviar notificación de expiración:", err.message);
  }
};

module.exports = { notificarCupoDisponible, notificarExpiracion };
