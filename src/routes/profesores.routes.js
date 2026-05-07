const express = require("express");
const auth = require("../middleware/auth.middleware");
const requirePermiso = require("../middleware/requirePermiso");
const { PERMISOS } = require("../constants/permisos");
const router = express.Router();
const {
  createProfesor,
  getAllProfesores,
  getProfesoresByActividad,
} = require("../controllers/profesores.controller");

router.get("/", getAllProfesores);
router.get("/actividad/:id", getProfesoresByActividad);
router.post("/", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), createProfesor);

module.exports = router;
