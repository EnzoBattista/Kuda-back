const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllPagos,
  createPago,
  createPreference,
} = require("../../controllers/pagos/pagos.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.PAGO_VER_TODOS), getAllPagos);
router.post("/", auth, requirePermiso(PERMISOS.PAGO_COBRAR), createPago);
router.post("/create-preference", auth, createPreference);

module.exports = router;
