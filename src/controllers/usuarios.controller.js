const { Usuario, Rol } = require("../../db");

const getAllUsuarios = async (_req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({ include: [{ model: Rol, as: "rol" }] });
    return res.status(200).json(usuarios);
  } catch (error) {
    return next(error);
  }
};

const getUsuarioById = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Rol, as: "rol" }],
    });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.status(200).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const createUsuario = async (req, res, next) => {
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
    return res.status(201).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    const { dni, nombreUsuario, nombre, apellido, password, direccion, edad, rol_id } = req.body;
    await usuario.update({ dni, nombreUsuario, nombre, apellido, password, direccion, edad, rol_id });
    return res.status(200).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    await usuario.destroy();
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
};
