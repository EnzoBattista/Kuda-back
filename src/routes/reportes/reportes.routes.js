const express = require("express");
const router = express.Router();

router.get("/horarios-mas-seleccionados", (req, res) => {
  res.status(200).json({ message: "Horarios mas seleccionados" });
});

router.get("/dinero-ingresado", (req, res) => {
  res.status(200).json({ message: "Dinero Ingresado" });
});

router.get("/usuarios-nuevos", (req, res) => {
  res.status(200).json({ message: "Usuarios Nuevos" });
});

module.exports = router;
