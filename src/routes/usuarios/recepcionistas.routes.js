const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const { createRecepcionista } = require("../../controllers/usuarios/recepcionistas.controller");

const router = express.Router();

router.post("/", auth, requirePermiso(PERMISOS.EMPLEADO_GESTIONAR), createRecepcionista);

module.exports = router;
