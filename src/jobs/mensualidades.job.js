const cron = require("node-cron");
const { procesarCicloVidaMensualidades } = require("../services/clases/mensualidadesLifecycle.service");

/**
 * Job diario: finalizar mensualidades, gracia, suspensión y recordatorios de pago.
 */
const iniciarJobMensualidades = () => {
  cron.schedule("0 6 * * *", async () => {
    try {
      const resultado = await procesarCicloVidaMensualidades();
      console.log("[mensualidades.job]", resultado);
    } catch (err) {
      console.error("[mensualidades.job] Error:", err.message);
    }
  });

  console.log("[mensualidades.job] Cron job iniciado (diario 06:00).");
};

module.exports = { iniciarJobMensualidades };
