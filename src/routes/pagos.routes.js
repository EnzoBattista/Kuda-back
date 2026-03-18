const express = require("express");
const { createPreference } = require("../controllers/pagos.controller");

const router = express.Router();

router.post("/create-preference", createPreference);

module.exports = router;
