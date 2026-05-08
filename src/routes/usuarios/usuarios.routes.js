const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllUsuarios,
  getUsuarioByEmail,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} = require("../../controllers/usuarios/usuarios.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), getAllUsuarios);
router.get("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), getUsuarioByEmail);
router.post("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), createUsuario);
router.put("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), updateUsuario);
router.delete("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), deleteUsuario);

module.exports = router;
