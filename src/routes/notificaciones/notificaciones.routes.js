const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const { notificarManual } = require("../../controllers/notificaciones/notificaciones.controller");

const router = express.Router();

router.post(
  "/manual",
  auth,
  requirePermiso(PERMISOS.USUARIO_GESTIONAR),
  notificarManual,
);

module.exports = router;
