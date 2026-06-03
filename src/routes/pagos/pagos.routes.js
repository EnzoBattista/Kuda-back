const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllPagos,
  registrarPago,
  generarPagoQr,
  createPreference,
  generarComprobante,
} = require("../../controllers/pagos/pagos.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.PAGO_VER_TODOS), getAllPagos);
router.post("/registrar", auth, requirePermiso(PERMISOS.PAGO_COBRAR), registrarPago);
router.post("/qr", auth, generarPagoQr);
router.post("/create-preference", auth, createPreference);
router.get("/:id/comprobante", auth, requirePermiso(PERMISOS.PAGO_VER_TODOS), generarComprobante);

module.exports = router;
