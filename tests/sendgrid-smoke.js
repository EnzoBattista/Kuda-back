require("dotenv").config();
const sgMail = require("@sendgrid/mail");

const apiKey = process.env.SENDGRID_API_KEY;
const from = process.env.EMAIL_FROM;

console.log("=== SendGrid smoke test (sandbox) ===");
console.log("API_KEY configurada:", apiKey ? `${apiKey.slice(0, 7)}...` : "(vacía)");
console.log("EMAIL_FROM:", from || "(vacío)");
console.log("");

if (!apiKey) {
  console.error("ERROR: SENDGRID_API_KEY no está configurada en .env");
  process.exit(1);
}
if (!from) {
  console.error("ERROR: EMAIL_FROM no está configurado en .env");
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const msg = {
  to: "smoke-test@example.com",
  from,
  subject: "Smoke test - Kuda",
  html: "<p>Esto no se envía, está en sandbox mode.</p>",
  mail_settings: {
    sandbox_mode: { enable: true },
  },
};

sgMail
  .send(msg)
  .then(([response]) => {
    console.log(`OK: SendGrid aceptó la request (status ${response.statusCode}).`);
    console.log("");
    console.log("La API key es válida.");
    console.log("El remitente está verificado.");
    console.log("La integración funciona — los emails reales se enviarán cuando");
    console.log("se llame al endpoint POST /api/auth/register.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("FAIL: SendGrid rechazó la request.");
    console.error("Status:", error.code || error.response?.statusCode);
    console.error("Mensaje:", error.message);
    if (error.response?.body?.errors) {
      console.error("Detalle:");
      for (const e of error.response.body.errors) {
        console.error(`  - ${e.message}${e.field ? ` (campo: ${e.field})` : ""}`);
      }
    }
    process.exit(1);
  });
