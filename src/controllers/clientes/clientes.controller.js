const { Cliente, Usuario, Rol } = require("../../../db");
const { ROLES } = require("../../constants/roles");
const { crearUsuario, actualizarUsuario } = require("../../services/acceso/usuarios.service");
const httpError = require("../../utils/httpError");

const getAllClientes = async (_req, res, next) => {
  try {
    const clientes = await Cliente.findAll({
      include: [
        {
          model: Usuario,
          as: "usuario",
          include: [{ model: Rol, as: "rol" }],
        },
      ],
    });
    return res.status(200).json(clientes);
  } catch (error) {
    return next(error);
  }
};

const getClienteById = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.email, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          include: [{ model: Rol, as: "rol" }],
        },
      ],
    });
    if (!cliente) return res.status(404).json({ message: "No existen clientes registrados" });
    return res.status(200).json(cliente);
  } catch (error) {
    return next(error);
  }
};

const CAMPOS_USUARIO_CREATE = ["email", "dni", "nombre", "apellido", "telefono", "password"];
const CAMPOS_USUARIO_UPDATE = ["dni", "nombre", "apellido", "telefono", "password"];
const CAMPOS_CLIENTE = ["genero", "fechaNacimiento", "fichaMedica", "direccion"];

const pickCampos = (body, campos) =>
  Object.fromEntries(campos.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const createCliente = async (req, res, next) => {
  try {
    const rolCliente = await Rol.findOne({ where: { nombre: ROLES.CLIENTE } });
    if (!rolCliente) {
      throw httpError(500, "Rol CLIENTE no existe. Ejecutar seeders.");
    }

    const usuarioData = {
      ...pickCampos(req.body, CAMPOS_USUARIO_CREATE),
      activo: true,
      rol_id: rolCliente.id,
    };
    const clienteData = pickCampos(req.body, CAMPOS_CLIENTE);

    const usuario = await crearUsuario(usuarioData);

    const cliente = await Cliente.create({
      usuario_email: usuario.email,
      ...clienteData,
    });

    return res.status(201).json({ ...usuario.toJSON(), ...cliente.toJSON() });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const updateCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.email);
    if (!cliente) return res.status(404).json({ message: "No existen clientes registrados" });

    const usuario = await Usuario.findByPk(req.params.email);
    if (!usuario) return res.status(404).json({ message: "Usuario asociado no encontrado" });

    const usuarioData = pickCampos(req.body, CAMPOS_USUARIO_UPDATE);
    const clienteData = pickCampos(req.body, CAMPOS_CLIENTE);

    // Validar edad si se está modificando la fecha de nacimiento
    if (clienteData.fechaNacimiento) {
      const { calcularEdad } = require("../../utils/fechas");
      if (calcularEdad(clienteData.fechaNacimiento) <= 14) {
        return res.status(400).json({ message: "Modificación fallida - Debe ser mayor de 14 años" });
      }
    }

    if (Object.keys(usuarioData).length > 0) {
      await actualizarUsuario(usuario, usuarioData);
    }
    if (Object.keys(clienteData).length > 0) {
      await cliente.update(clienteData);
    }

    return res.status(200).json({
      message: "Se ha modificado su información personal",
      cliente: { ...usuario.toJSON(), ...cliente.toJSON() }
    });
  } catch (error) {
    return next(error);
  }
};

const deleteCliente = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.email);
    if (!usuario) return res.status(404).json({ message: "Cliente (Usuario) no encontrado" });

    if (!usuario.activo) {
      return res.status(410).json({ message: "Cliente ya dado de baja" });
    }

    usuario.activo = false;
    await usuario.save();

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
};
