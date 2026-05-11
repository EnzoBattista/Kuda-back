const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllInscripcionesIndividuales,
  getInscripcionIndividualById,
  createInscripcionIndividual,
  completarSeña,
} = require("../../controllers/clases/inscripcionesIndividuales.controller");

const router = express.Router();

router.get("/", auth, getAllInscripcionesIndividuales);
router.get("/:id", auth, getInscripcionIndividualById);
router.post("/", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), createInscripcionIndividual);
router.post(
  "/:id/completar-sena",
  auth,
  requirePermiso(PERMISOS.CLASE_RESERVAR),
  completarSeña
);

module.exports = router;
