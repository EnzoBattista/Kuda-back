const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getReservasActivas,
  getHistorialReservas,
  cancelarReservaController,
  getMisVales,
} = require("../../controllers/clases/reservas.controller");

const router = express.Router();

// Reservas activas (próximas) — filtrable por cliente_email, actividad_id, clase_id
router.get("/", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), getReservasActivas);

// Historial de reservas pasadas o canceladas — paginado y filtrable
router.get("/historial", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), getHistorialReservas);

// Vales de descuento vigentes del cliente autenticado
router.get("/mis-vales", auth, getMisVales);

// Cancelar una reserva concreta
router.patch("/:id/cancelar", auth, requirePermiso(PERMISOS.CLASE_RESERVAR), cancelarReservaController);

module.exports = router;
