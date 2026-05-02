const express = require("express");
const { register, confirmarCuenta, login } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.get("/confirmar/:token", confirmarCuenta);
router.post("/login", login);

module.exports = router;
