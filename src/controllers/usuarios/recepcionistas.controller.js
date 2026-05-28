const { Usuario, Rol } = require("../../../db");
const { ROLES } = require("../../constants/roles");
const { crearUsuario, darDeBajaUsuario } = require("../../services/acceso/usuarios.service");
const httpError = require("../../utils/httpError");

const CAMPOS_RECEPCIONISTA = ["email", "dni", "nombre", "apellido", "telefono", "password"];

const pickCampos = (body) =>
  Object.fromEntries(CAMPOS_RECEPCIONISTA.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const createRecepcionista = async (req, res, next) => {
  try {
    const datos = pickCampos(req.body);

    if (!datos.password || datos.password.length < 8) {
      throw httpError(400, "La contraseña debe tener al menos 8 caracteres");
    }

    const existente = await Usuario.findOne({ where: { email: datos.email } });
    if (existente) {
      throw httpError(409, "El correo electrónico ya está en uso por otro usuario");
    }

    const rolRecepcionista = await Rol.findOne({ where: { nombre: ROLES.RECEPCIONISTA } });
    if (!rolRecepcionista) {
      throw httpError(500, "Rol RECEPCIONISTA no existe. Ejecutar seeders.");
    }

    const recepcionista = await crearUsuario({
      ...datos,
      activo: true,
      rol_id: rolRecepcionista.id,
    });

    return res.status(201).json({
      message: "Recepcionista registrado con éxito",
      recepcionista,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const deleteRecepcionista = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.email, {
      include: [{ model: Rol, as: "rol" }],
    });
    if (!usuario) {
      throw httpError(404, "Recepcionista no encontrado");
    }
    if (!usuario.rol || usuario.rol.nombre !== ROLES.RECEPCIONISTA) {
      throw httpError(400, "El usuario indicado no es un recepcionista");
    }

    await darDeBajaUsuario(req.params.email);
    return res.status(200).json({ message: "Recepcionista eliminado con éxito" });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = { createRecepcionista, deleteRecepcionista };
