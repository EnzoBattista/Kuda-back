const { Usuario, Rol } = require("../../../db");

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

const CAMPOS_USUARIO = [
  "dni",
  "nombre",
  "apellido",
  "email",
  "genero",
  "fechaNacimiento",
  "telefono",
  "fichaMedica",
  "password",
  "rol_id",
];

const pickCampos = (body) =>
  Object.fromEntries(CAMPOS_USUARIO.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const createUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.create({ ...pickCampos(req.body), activo: true });
    return res.status(201).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    await usuario.update(pickCampos(req.body));
    return res.status(200).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!usuario.activo) {
      return res.status(410).json({ message: "Usuario ya dado de baja" });
    }

    usuario.activo = false;
    await usuario.save();

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
