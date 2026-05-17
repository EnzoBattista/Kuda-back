const cron = require("node-cron");
const { verificarExpirados } = require("../services/clases/listaEspera.service");

/**
 * Inicia el cron job que verifica cada 10 minutos si alguna notificación
 * de lista de espera expiró (pasaron 6hs sin confirmar el pago).
 */
const iniciarJobListaEspera = () => {
  // Corre cada 10 minutos: "*/10 * * * *"
  cron.schedule("*/10 * * * *", async () => {
    try {
      await verificarExpirados();
    } catch (err) {
      console.error("[listaEspera.job] Error al verificar expirados:", err.message);
    }
  });

  console.log("[listaEspera.job] Cron job iniciado (cada 10 minutos).");
};

module.exports = { iniciarJobListaEspera };
