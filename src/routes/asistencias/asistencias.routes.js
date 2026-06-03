const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getHistorial,
  escanearQr,
  registrarAsistencia,
  getClasesHoy,
} = require("../../controllers/asistencias/asistencias.controller");

const router = express.Router();

router.get("/historial", auth, getHistorial);

router.get(
  "/clases-hoy",
  auth,
  requirePermiso(PERMISOS.ASISTENCIA_ESCANEAR),
  getClasesHoy,
);

router.post(
  "/escanear",
  auth,
  requirePermiso(PERMISOS.ASISTENCIA_ESCANEAR),
  escanearQr,
);

router.post(
  "/registrar",
  auth,
  requirePermiso(PERMISOS.ASISTENCIA_ESCANEAR),
  registrarAsistencia,
);

module.exports = router;
