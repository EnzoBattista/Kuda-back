const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllEmpleados,
  getEmpleadoByEmail,
} = require("../../controllers/usuarios/empleados.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.EMPLEADO_GESTIONAR), getAllEmpleados);
router.get("/:email", auth, requirePermiso(PERMISOS.EMPLEADO_GESTIONAR), getEmpleadoByEmail);

module.exports = router;
