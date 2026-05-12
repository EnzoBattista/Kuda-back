const express = require("express");
const {
  getAllActividades,
  createActividad,
  updateActividad,
  updatePrecio,
  deleteActividad,
  getProfesoresPorActividad,
} = require("../../controllers/catalogo/actividades.controller");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");

const router = express.Router();

// GET /api/actividades (protegido por auth, para clientes, recepcionistas, admins)
router.get("/", auth, getAllActividades);

// POST /api/actividades (solo admin con ACTIVIDAD_GESTIONAR)
router.post("/", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), createActividad);

// PUT /api/actividades/:id (solo admin)
router.put("/:id", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), updateActividad);

// PATCH /api/actividades/:id/precio (solo admin)
router.patch("/:id/precio", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), updatePrecio);

// DELETE /api/actividades/:id (solo admin)
router.delete("/:id", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), deleteActividad);

// GET /api/actividades/:id/profesores (protegido por auth)
router.get("/:id/profesores", auth, getProfesoresPorActividad);

module.exports = router;
