const express = require("express");
const auth = require("../middleware/auth.middleware");
const requirePermiso = require("../middleware/requirePermiso");
const { PERMISOS } = require("../constants/permisos");
const {
  getAllMensualidades,
  getMensualidadById,
  createMensualidad,
  cancelarMensualidad,
} = require("../controllers/mensualidades.controller");

const router = express.Router();

router.get("/", auth, getAllMensualidades);
router.get("/:id", auth, getMensualidadById);
router.post("/", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), createMensualidad);
router.patch(
  "/:id/cancelar",
  auth,
  requirePermiso(PERMISOS.CLASE_RESERVAR),
  cancelarMensualidad
);

module.exports = router;
