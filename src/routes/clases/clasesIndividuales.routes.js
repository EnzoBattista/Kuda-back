const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllClasesIndividuales,
  getClaseIndividualById,
  createClaseIndividual,
  completarSeña,
} = require("../../controllers/clases/clasesIndividuales.controller");

const router = express.Router();

router.get("/", auth, getAllClasesIndividuales);
router.get("/:id", auth, getClaseIndividualById);
router.post("/", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), createClaseIndividual);
router.post(
  "/:id/completar-sena",
  auth,
  requirePermiso(PERMISOS.CLASE_RESERVAR),
  completarSeña
);

module.exports = router;
