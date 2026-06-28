const cron = require("node-cron");
const { liberarCuposDiferidos } = require("../services/clases/listaEspera.service");
const { cancelarSeñasVencidas } = require("../services/clases/reservas.service");

/**
 * Inicia el cron job que libera los cupos de clases próximas a ocurrir
 * Además, libera los cupos de clases próximas a ocurrir para los usuarios en espera individual.
 */
const iniciarJobListaEspera = () => {
  // Corre cada 10 minutos: "*/10 * * * *"
  cron.schedule("*/10 * * * *", async () => {
    try {
      await cancelarSeñasVencidas();
      await liberarCuposDiferidos();
    } catch (err) {
      console.error("[listaEspera.job] Error al verificar expirados:", err.message);
    }
  });

  console.log("[listaEspera.job] Cron job iniciado (cada 10 minutos).");
};

module.exports = { iniciarJobListaEspera };
