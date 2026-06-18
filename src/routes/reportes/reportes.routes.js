const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getTotalUsuarios,
  getUsuariosNuevos,
  getIngresos,
  getIngresosMensuales,
  getHorariosSeleccionados,
  getHorariosPopulares,
} = require("../../controllers/reportes/reportes.controller");

const router = express.Router();
const soloDueno = requirePermiso(PERMISOS.REPORTE_VER);

router.get("/total-usuarios", auth, soloDueno, getTotalUsuarios);
router.get("/usuarios-nuevos", auth, soloDueno, getUsuariosNuevos);
router.get("/ingresos", auth, soloDueno, getIngresos);
router.get("/ingresos-mensuales", auth, soloDueno, getIngresosMensuales);
router.get("/horarios-seleccionados", auth, soloDueno, getHorariosSeleccionados);
router.get("/horarios-populares", auth, soloDueno, getHorariosPopulares);

module.exports = router;
