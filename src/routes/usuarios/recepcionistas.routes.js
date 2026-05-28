const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const { createRecepcionista, deleteRecepcionista } = require("../../controllers/usuarios/recepcionistas.controller");

const router = express.Router();

router.post("/", auth, requirePermiso(PERMISOS.ADMINISTRATIVO_GESTIONAR), createRecepcionista);
router.delete("/:email", auth, requirePermiso(PERMISOS.ADMINISTRATIVO_GESTIONAR), deleteRecepcionista);

module.exports = router;
