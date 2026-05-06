const express = require("express");
const {
  getAllSocios,
  createSocio,
} = require("../controllers/abonados.controller");

const router = express.Router();

router.get("/", getAllSocios);
router.post("/", createSocio);

module.exports = router;
