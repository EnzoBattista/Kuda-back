const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} = require("../../controllers/usuarios/usuarios.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), getAllUsuarios);
router.get("/:id", auth, getUsuarioById);
router.post("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), createUsuario);
router.put("/:id", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), updateUsuario);
router.delete("/:id", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), deleteUsuario);

module.exports = router;
