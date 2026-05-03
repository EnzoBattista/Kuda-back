const express = require("express");
const {
  getAllClases,
  createClase,
} = require("../controllers/clases.controller");

const router = express.Router();

router.get("/", getAllClases);
router.post("/", createClase);

module.exports = router;
