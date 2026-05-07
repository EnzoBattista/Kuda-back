const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllClases,
  createClase,
  updateClase,
} = require("../../controllers/clases/clases.controller");

const router = express.Router();

router.get("/", getAllClases);
router.post("/", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), createClase);
router.put("/:id", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), updateClase);

module.exports = router;
