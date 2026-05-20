const express = require("express");
const router = express.Router();

router.post("/activar", (req, res) => {
  res.status(200).json({ message: "Notificaciones activadas" });
});

router.post("/desactivar", (req, res) => {
  res.status(200).json({ message: "Notificaciones desactivadas" });
});

router.post("/recordatorio", (req, res) => {
  res.status(200).json({ message: "Recordatorio enviado" });
});

module.exports = router;
