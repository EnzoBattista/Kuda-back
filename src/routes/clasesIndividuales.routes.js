const express = require("express");
const {
  getAllClasesIndividuales,
  getClaseIndividualById,
  createClaseIndividual,
  completarSeña,
} = require("../controllers/clasesIndividuales.controller");

const router = express.Router();

router.get("/", getAllClasesIndividuales);
router.get("/:id", getClaseIndividualById);
router.post("/", createClaseIndividual);
router.post("/:id/completar-sena", completarSeña);

module.exports = router;
