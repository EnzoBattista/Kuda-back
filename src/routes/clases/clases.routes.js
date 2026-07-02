const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllClases,
  createClase,
  updateClase,
  getClaseById,
  deleteClase,
  cancelarFechaClase,
  checkConflicto,
  getInscriptosClase,
} = require("../../controllers/clases/clases.controller");

const router = express.Router();

router.get("/", getAllClases);
router.get("/:id", auth, getClaseById);
router.get("/:id/inscriptos", auth, getInscriptosClase);
router.post("/", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), createClase);
router.put("/:id", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), updateClase);
router.delete("/:id", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), deleteClase);
router.post("/:id/cancelaciones", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), cancelarFechaClase);
router.get("/:id/conflicto", auth, checkConflicto);

module.exports = router;
