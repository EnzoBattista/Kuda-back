const express = require("express");
const auth = require("../middleware/auth.middleware");
const requirePermiso = require("../middleware/requirePermiso");
const { PERMISOS } = require("../constants/permisos");
const {
  getAllPlanes,
  createPlan,
} = require("../controllers/planes.controller");

const router = express.Router();

router.get("/", getAllPlanes);
router.post("/", auth, requirePermiso(PERMISOS.ACTIVIDAD_GESTIONAR), createPlan);

module.exports = router;
