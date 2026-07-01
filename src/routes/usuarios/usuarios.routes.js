const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllUsuarios,
  getUsuarioByEmail,
  updateUsuario,
  deleteUsuario,
  toggleEstadoUsuario,
} = require("../../controllers/usuarios/usuarios.controller");
const { getMiQr } = require("../../controllers/usuarios/qr.controller");

const router = express.Router();

router.get("/me/qr", auth, getMiQr);
router.get("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), getAllUsuarios);
router.get("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR, { allowSelf: true }), getUsuarioByEmail);
router.put("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR, { allowSelf: true }), updateUsuario);
router.delete("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), deleteUsuario);
router.patch("/:email/estado", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), toggleEstadoUsuario);

module.exports = router;
