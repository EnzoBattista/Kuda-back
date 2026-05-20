const express = require("express");
const auth = require("../../middleware/auth.middleware");
const {
  getAllSalas,
  getSalaById,
  createSala,
  updateSala,
  deleteSala,
} = require("../../controllers/catalogo/salas.controller");

const router = express.Router();

router.get("/", auth, getAllSalas);
router.get("/:id", auth, getSalaById);
router.post("/", auth, createSala);
router.put("/:id", auth, updateSala);
router.delete("/:id", auth, deleteSala);

module.exports = router;
