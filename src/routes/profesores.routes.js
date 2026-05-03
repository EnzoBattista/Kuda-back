const express = require("express");
const router = express.Router();
const {
  createProfesor,
  getAllProfesores,
  getProfesoresByActividad,
} = require("../controllers/profesores.controller");

router.get("/", getAllProfesores);
router.get("/actividad/:id", getProfesoresByActividad);
router.post("/", createProfesor);

module.exports = router;
