const jwt = require("jsonwebtoken");
const { Usuario } = require("../../db");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }

  try {
    const usuario = await Usuario.findByPk(payload.email, { attributes: ["email", "activo"] });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ message: "Sesión inválida" });
    }
    req.usuario = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;
