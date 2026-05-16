const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const router = express.Router();
const {
  createProfesor,
  updateProfesor,
  deleteProfesor,
  getAllProfesores,
  getProfesoresByActividad,
} = require("../../controllers/catalogo/profesores.controller");

router.get("/", getAllProfesores);
router.get("/actividad/:id", getProfesoresByActividad);
router.post("/", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), createProfesor);
router.put("/:id", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), updateProfesor);
router.delete("/:id", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), deleteProfesor);

module.exports = router;
