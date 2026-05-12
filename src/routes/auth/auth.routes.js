const express = require("express");
const auth = require("../../middleware/auth.middleware");
const { register, confirmarCuenta, login, logout } = require("../../controllers/auth/auth.controller");

const router = express.Router();

router.post("/register", register);
router.get("/confirmar/:token", confirmarCuenta);
router.post("/login", login);
router.post("/logout", auth, logout);

module.exports = router;
