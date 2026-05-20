const { verificarExpirados } = require("../../services/clases/listaEspera.service");

const verificarListaEspera = async (req, res) => {
  // Verifica que el request provenga de Vercel Cron
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await verificarExpirados();
    return res.status(200).json({ message: "Job ejecutado exitosamente" });
  } catch (err) {
    console.error("[Cron Job] Error al verificar expirados:", err.message);
    return res.status(500).json({ message: "Error interno en el cron job" });
  }
};

module.exports = {
  verificarListaEspera,
};
