const express = require("express");
const router = express.Router();

router.post("/escanear", (req, res) => {
  const { codigo } = req.body;
  if (codigo === "invalido") {
    return res.status(400).json({ message: "El QR no es válido y se cancela la operación sin registrar la asistencia" });
  }
  return res.status(200).json({ message: "Reserva confirmada con éxito" });
});

module.exports = router;
