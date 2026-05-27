const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllAdministrativos,
  getAdministrativoByEmail,
} = require("../../controllers/usuarios/administrativos.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.ADMINISTRATIVO_GESTIONAR), getAllAdministrativos);
router.get("/:email", auth, requirePermiso(PERMISOS.ADMINISTRATIVO_GESTIONAR), getAdministrativoByEmail);

module.exports = router;
