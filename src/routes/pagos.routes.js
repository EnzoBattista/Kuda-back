const express = require("express");
const {
  getAllPagos,
  createPago,
  createPreference,
} = require("../controllers/pagos.controller");

const router = express.Router();

router.get("/", getAllPagos);
router.post("/", createPago);
router.post("/create-preference", createPreference);

module.exports = router;
