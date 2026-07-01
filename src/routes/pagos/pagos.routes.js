const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllPagos,
  createPreference,
  getEstadoPago,
  abandonarPago,
  liberarReservaPendiente,
  webhookMercadoPago,
  generarComprobante,
} = require("../../controllers/pagos/pagos.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.PAGO_VER_TODOS), getAllPagos);
router.post("/create-preference", auth, createPreference);
router.post("/liberar-pendiente", auth, liberarReservaPendiente);
router.post("/webhook/mercadopago", webhookMercadoPago);
router.post("/:id/abandonar", auth, abandonarPago);
router.get("/:id/estado", auth, getEstadoPago);
router.get("/:id/comprobante", auth, requirePermiso(PERMISOS.PAGO_VER_TODOS), generarComprobante);

module.exports = router;
