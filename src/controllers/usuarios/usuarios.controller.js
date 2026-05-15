const { Op } = require("sequelize");
const { Usuario, Rol } = require("../../../db");
const { crearUsuario, actualizarUsuario, darDeBajaUsuario } = require("../../services/acceso/usuarios.service");

const parseBool = (valor) => {
  if (valor === undefined) return undefined;
  if (typeof valor === "boolean") return valor;
  if (valor === "true") return true;
  if (valor === "false") return false;
  return undefined;
};

const getAllUsuarios = async (req, res, next) => {
  try {
    const { rol, activo, q } = req.query;
    const where = {};

    const activoBool = parseBool(activo);
    if (activoBool !== undefined) where.activo = activoBool;

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.iLike]: term } },
        { apellido: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { dni: { [Op.iLike]: term } },
      ];
    }

    const includeRol = { model: Rol, as: "rol" };
    if (rol && rol.trim()) {
      includeRol.where = { nombre: rol.trim().toUpperCase() };
      includeRol.required = true;
    }

    const usuarios = await Usuario.findAll({
      where,
      include: [includeRol],
      order: [["apellido", "ASC"], ["nombre", "ASC"]],
    });
    return res.status(200).json(usuarios);
  } catch (error) {
    return next(error);
  }
};

const getUsuarioByEmail = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.email, {
      include: [{ model: Rol, as: "rol" }],
    });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.status(200).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const CAMPOS_USUARIO = ["email", "dni", "nombre", "apellido", "telefono", "password", "rol_id"];

const pickCampos = (body) =>
  Object.fromEntries(CAMPOS_USUARIO.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const createUsuario = async (req, res, next) => {
  try {
    const usuario = await crearUsuario({ ...pickCampos(req.body), activo: true });
    return res.status(201).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.email);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    await actualizarUsuario(usuario, pickCampos(req.body));
    return res.status(200).json(usuario);
  } catch (error) {
    return next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    await darDeBajaUsuario(req.params.email);
    return res.status(204).send();
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioByEmail,
  createUsuario,
  updateUsuario,
  deleteUsuario,
};
