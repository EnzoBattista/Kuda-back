const jwt = require("jsonwebtoken");
const { Usuario, Rol } = require("../../db");
const authService = require("../services/auth.service");

const generarToken = (usuario) => {
  return jwt.sign(
    { id: usuario.id, nombreUsuario: usuario.nombreUsuario, rol_id: usuario.rol_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
};

const register = async (req, res, next) => {
  try {
    const resultado = await authService.registrarCliente(req.body);
    return res.status(201).json(resultado);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

const confirmarCuenta = async (req, res, next) => {
  try {
    const resultado = await authService.confirmarCuenta(req.params.token);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Datos de inicio de sesión incorrectos" });
    }

    const usuario = await Usuario.findOne({
      where: { email },
      include: [{ model: Rol, as: "rol" }],
    });

    if (!usuario) {
      return res.status(401).json({ message: "Datos de inicio de sesión incorrectos" });
    }

    const passwordValida = await usuario.verificarPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ message: "Datos de inicio de sesión incorrectos" });
    }

    const token = generarToken(usuario);
    return res.status(200).json({ usuario, token });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, confirmarCuenta, login };
