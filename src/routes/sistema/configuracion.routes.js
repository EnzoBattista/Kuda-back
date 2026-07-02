const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getConfiguracion,
  patchConfiguracion,
} = require("../../controllers/sistema/configuracion.controller");

const router = express.Router();

router.get("/", auth, getConfiguracion);
router.patch("/", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), patchConfiguracion);

module.exports = router;
