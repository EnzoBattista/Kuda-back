const express = require("express");
const auth = require("../../middleware/auth.middleware");
const requirePermiso = require("../../middleware/requirePermiso");
const { PERMISOS } = require("../../constants/permisos");
const {
  getAllSalas,
  getSalaById,
  createSala,
  updateSala,
  deshabilitarSala,
  deleteSala,
} = require("../../controllers/catalogo/salas.controller");

const router = express.Router();

const gestionarSalas = requirePermiso(PERMISOS.CLASE_GESTIONAR);

router.get("/", auth, gestionarSalas, getAllSalas);
router.get("/:id", auth, gestionarSalas, getSalaById);
router.post("/", auth, gestionarSalas, createSala);
router.put("/:id", auth, gestionarSalas, updateSala);
router.patch("/:id/deshabilitar", auth, gestionarSalas, deshabilitarSala);
router.delete("/:id", auth, gestionarSalas, deleteSala);

module.exports = router;
