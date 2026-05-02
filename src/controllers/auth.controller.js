const jwt = require("jsonwebtoken");
const { Usuario, Rol } = require("../../db");

const generarToken = (usuario) => {
  return jwt.sign(
    { id: usuario.id, nombreUsuario: usuario.nombreUsuario, rol_id: usuario.rol_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
};

const register = async (req, res, next) => {
  try {
    const { dni, nombreUsuario, nombre, apellido, password, direccion, edad, rol_id } = req.body;
    const usuario = await Usuario.create({
      dni,
      nombreUsuario,
      nombre,
      apellido,
      password,
      direccion,
      edad,
      rol_id,
    });
    const token = generarToken(usuario);
    return res.status(201).json({ usuario, token });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { nombreUsuario, password } = req.body;

    if (!nombreUsuario || !password) {
      return res.status(400).json({ message: "Nombre de usuario y contraseña son requeridos" });
    }

    const usuario = await Usuario.findOne({
      where: { nombreUsuario },
      include: [{ model: Rol, as: "rol" }],
    });

    if (!usuario) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const passwordValida = await usuario.verificarPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = generarToken(usuario);
    return res.status(200).json({ usuario, token });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login };
