const express = require("express");
const router = express.Router();

router.post("/activar", (req, res) => {
  res.status(200).json({ message: "Notificaciones activadas" });
});

router.post("/desactivar", (req, res) => {
  res.status(200).json({ message: "Notificaciones desactivadas" });
});

router.post("/recordatorio", (req, res) => {
  const { diaRecordatorio } = req.body;
  if (diaRecordatorio !== undefined) {
    if (diaRecordatorio < 0 || diaRecordatorio > 10) {
      return res.status(400).json({ message: "El día de recordatorio debe estar dentro de los 10 días de gracia" });
    }
  }
  res.status(200).json({ message: "Recordatorio enviado/configurado" });
});

module.exports = router;
