const jwt = require("jsonwebtoken");
const { Usuario, Rol, Cliente } = require("../../../db");
const authService = require("../../services/auth/auth.service");

const generarToken = (usuario) => {
  return jwt.sign(
    { email: usuario.email, rol_id: usuario.rol_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
};

const register = async (req, res, next) => {
  try {
    const resultado = await authService.registrarCliente(req.body);
    return res.status(201).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const confirmarCuenta = async (req, res, next) => {
  try {
    const resultado = await authService.confirmarCuenta(req.params.token);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
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
      include: [
        { model: Rol, as: "rol" },
        { model: Cliente, as: "cliente", required: false },
      ],
    });

    if (!usuario) {
      return res.status(401).json({ message: "Datos de inicio de sesión incorrectos" });
    }

    const passwordValida = await usuario.verificarPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ message: "Datos de inicio de sesión incorrectos" });
    }

    if (!usuario.activo) {
      if (!usuario.tokenConfirmacion) {
        return res.status(401).json({ message: "Datos de inicio de sesión incorrectos" });
      }
      return res.status(403).json({
        message: "La cuenta aún no fue confirmada. Revisá tu casilla de email para activar el registro.",
        codigo: "CUENTA_INACTIVA",
      });
    }

    const token = generarToken(usuario);
    const usuarioJson = usuario.toJSON();
    const payload = {
      ...usuarioJson,
      genero: usuarioJson.cliente?.genero ?? null,
      fechaNacimiento: usuarioJson.cliente?.fechaNacimiento ?? null,
    };
    delete payload.cliente;
    return res.status(200).json({ usuario: payload, token });
  } catch (error) {
    return next(error);
  }
};

const logout = (_req, res) => {
  return res.status(200).json({ message: "Sesión cerrada correctamente" });
};

const cambiarPassword = async (req, res, next) => {
  try {
    const resultado = await authService.cambiarPassword(req.usuario.email, req.body);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const solicitarRecuperacion = async (req, res, next) => {
  try {
    const { email } = req.body;
    const resultado = await authService.solicitarRecuperacionPassword(email);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const resetearPassword = async (req, res, next) => {
  try {
    const { token, passwordNueva, confirmPassword } = req.body;
    const resultado = await authService.resetearPassword(token, passwordNueva, confirmPassword);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = { 
  register, 
  confirmarCuenta, 
  login, 
  logout, 
  cambiarPassword,
  solicitarRecuperacion,
  resetearPassword
};
