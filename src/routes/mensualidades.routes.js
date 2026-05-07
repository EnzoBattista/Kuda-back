const express = require("express");
const {
  getAllMensualidades,
  getMensualidadById,
  createMensualidad,
  cancelarMensualidad,
} = require("../controllers/mensualidades.controller");

const router = express.Router();

router.get("/", getAllMensualidades);
router.get("/:id", getMensualidadById);
router.post("/", createMensualidad);
router.patch("/:id/cancelar", cancelarMensualidad);

module.exports = router;
