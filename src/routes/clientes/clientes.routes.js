const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} = require("../../controllers/clientes/clientes.controller");

const router = express.Router();

router.get("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), getAllClientes);
router.get("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR, { allowSelf: true }), getClienteById);
router.post("/", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), createCliente);
router.put("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR, { allowSelf: true }), updateCliente);
router.delete("/:email", auth, requirePermiso(PERMISOS.USUARIO_GESTIONAR), deleteCliente);

module.exports = router;
