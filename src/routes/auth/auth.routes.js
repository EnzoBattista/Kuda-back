const express = require("express");
const auth = require("../../middleware/auth.middleware");
const { 
  register, 
  confirmarCuenta, 
  login, 
  logout, 
  cambiarPassword,
  solicitarRecuperacion,
  resetearPassword
} = require("../../controllers/auth/auth.controller");

const router = express.Router();

router.post("/register", register);
router.get("/confirmar/:token", confirmarCuenta);
router.post("/login", login);
router.post("/logout", auth, logout);
router.post("/cambiar-password", auth, cambiarPassword);
router.post("/olvide-password", solicitarRecuperacion);
router.post("/reset-password", resetearPassword);

module.exports = router;
