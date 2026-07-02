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
    let cliente = await Cliente.findByPk(req.params.email);

    const usuario = await Usuario.findByPk(req.params.email);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

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
    
    if (!cliente) {
      cliente = await Cliente.create({
        usuario_email: req.params.email,
        ...clienteData,
      });
    } else if (Object.keys(clienteData).length > 0) {
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
    const email = req.params.email;
    const { darDeBajaUsuario } = require("../../services/acceso/usuarios.service");
    
    // Get user to use name in email
    const usuario = await Usuario.findByPk(email);
    if (!usuario) return res.status(404).json({ message: "Cliente (Usuario) no encontrado" });

    const cliente = await Cliente.findByPk(email);
    
    // Use the service to safely deactivate and cancel subscriptions
    await darDeBajaUsuario(email);

    // Send email notification
    const sgMail = require("@sendgrid/mail");
    if (cliente && cliente.notificaciones_activas && process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      try {
        await sgMail.send({
          to: email,
          from: process.env.EMAIL_FROM,
          subject: "Baja en CEF Actividades",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #003366;">Hola, ${usuario.nombre}</h2>
              <p>Te informamos que tu cuenta ha sido eliminada de nuestro sistema.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">CEF Actividades — Centro de bienestar</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[deleteCliente] Error SendGrid:", err.message);
      }
    } else {
      console.log("[deleteCliente] Simulación envío correo eliminación a", email);
    }

    return res.status(200).json({ message: "Cliente eliminado con éxito" });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
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
