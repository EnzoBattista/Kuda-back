const express = require("express");
const {
  getAllClases,
  createClase,
  updateClase,
} = require("../controllers/clases.controller");

const router = express.Router();

router.get("/", getAllClases);
router.post("/", createClase);
router.put("/:id", updateClase);

module.exports = router;
