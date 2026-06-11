const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  anotarse,
  getListaGlobal,
  getLista,
  getMisPendientes,
  confirmar,
  rechazar,
  removerManual,
} = require("../../controllers/clases/listaEspera.controller");

const router = express.Router();

router.get("/me/pendientes", auth, getMisPendientes);
router.post("/:id/confirmar", auth, confirmar);
router.post("/:id/rechazar", auth, rechazar);

router.post("/", auth, anotarse);

router.get("/", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), getListaGlobal);

router.get("/:claseId", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), getLista);

// Recepcionista remueve manualmente a alguien de la lista (HU 39)
router.delete("/:id", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), removerManual);

module.exports = router;
