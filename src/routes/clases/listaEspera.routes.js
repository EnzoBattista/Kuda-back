const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const { anotarse, getLista, removerManual } = require("../../controllers/clases/listaEspera.controller");

const router = express.Router();

// Cliente logueado se anota en la lista de espera
router.post("/", auth, anotarse);

// Recepcionista consulta la lista de espera de una clase
router.get("/:claseId", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), getLista);

// Recepcionista remueve manualmente a alguien de la lista (HU 39)
router.delete("/:id", auth, requirePermiso(PERMISOS.CLASE_GESTIONAR), removerManual);

module.exports = router;
