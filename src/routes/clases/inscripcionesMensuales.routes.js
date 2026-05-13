const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllInscripcionesMensuales,
  getInscripcionMensualById,
  createInscripcionMensual,
  cancelarInscripcionMensual,
} = require("../../controllers/clases/inscripcionesMensuales.controller");

const router = express.Router();

router.get("/", auth, getAllInscripcionesMensuales);
router.get("/:id", auth, getInscripcionMensualById);
router.post("/", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), createInscripcionMensual);
router.patch(
  "/:id/cancelar",
  auth,
  requirePermiso(PERMISOS.CLASE_RESERVAR),
  cancelarInscripcionMensual
);

module.exports = router;
