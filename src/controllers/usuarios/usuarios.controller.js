const { Op } = require("sequelize");
const { Usuario, Rol, Cliente } = require("../../../db");
const { actualizarUsuario, darDeBajaUsuario } = require("../../services/acceso/usuarios.service");
const sgMail = require("@sendgrid/mail");

const parseBool = (valor) => {
  if (valor === undefined) return undefined;
  if (typeof valor === "boolean") return valor;
  if (valor === "true") return true;
  if (valor === "false") return false;
  return undefined;
};

const getAllUsuarios = async (req, res, next) => {
  try {
    const { rol, activo, estado, q } = req.query;
    const where = {};

    const activoBool = parseBool(activo);
    if (activoBool !== undefined) where.activo = activoBool;

    if (estado === "ACTIVO") {
      where.activo = true;
      where.email = { [Op.notLike]: '%_deleted_%' };
    } else if (estado === "PENDIENTE") {
      where.activo = false;
      where.tokenConfirmacion = { [Op.not]: null };
    } else if (estado === "DESACTIVADO") {
      where.activo = false;
      where.tokenConfirmacion = null;
      where.email = { [Op.notLike]: '%_deleted_%' };
    } else if (estado === "ELIMINADO") {
      where.activo = false;
      where.tokenConfirmacion = null;
      where.email = { [Op.like]: '%_deleted_%' };
    }

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.iLike]: term } },
        { apellido: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { dni: { [Op.iLike]: term } },
      ];
    }

    // Excluir clientes pendientes con token expirado (> 48h)
    where[Op.and] = [
      {
        [Op.or]: [
          { tokenConfirmacion: null },
          { tokenExpiracion: { [Op.gt]: new Date() } }
        ]
      }
    ];

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
    if (usuarios.length === 0) {
      return res.status(200).json({ message: "No se han encontrado usuarios", data: [] });
    }
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

const CAMPOS_USUARIO = ["dni", "nombre", "apellido", "telefono", "password"];

const pickCampos = (body) =>
  Object.fromEntries(CAMPOS_USUARIO.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const updateUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.email);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    const data = pickCampos(req.body);



    // Validar edad si se incluye fecha de nacimiento en el body (a través del cliente asociado)
    if (req.body.fechaNacimiento) {
      const { calcularEdad } = require("../../utils/fechas");
      if (calcularEdad(req.body.fechaNacimiento) <= 14) {
        return res.status(400).json({ message: "El usuario debe ser mayor de 14 años" });
      }
    }

    await actualizarUsuario(usuario, data);
    return res.status(200).json({ message: "Usuario editado con éxito", usuario });
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

const toggleEstadoUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.email);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    if (usuario.email.includes("_deleted_")) {
      return res.status(400).json({ message: "No se puede cambiar el estado de un usuario eliminado" });
    }

    usuario.activo = !usuario.activo;
    await usuario.save();

    // Notificar al cliente
    const cliente = await Cliente.findByPk(usuario.email);
    if (cliente && process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const estadoStr = usuario.activo ? 'activada' : 'desactivada';
      const mensaje = `Hola ${usuario.nombre}, te informamos que tu cuenta en CEF Actividades ha sido ${estadoStr}.`;
      await sgMail.send({
        to: usuario.email,
        from: process.env.EMAIL_FROM,
        subject: `Tu cuenta ha sido ${estadoStr} - CEF Actividades`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #003366;">Actualización de cuenta</h2>
            <p>${mensaje}</p>
          </div>
        `,
      }).catch(err => console.error("Error enviando email de estado de cuenta:", err));
    } else if (cliente) {
      console.log(`[toggleEstadoUsuario] email mock: Tu cuenta ha sido ${usuario.activo ? 'activada' : 'desactivada'}`);
    }

    return res.status(200).json({ message: `Usuario ${usuario.activo ? 'activado' : 'desactivado'} con éxito`, usuario: usuario.toJSON() });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioByEmail,
  updateUsuario,
  deleteUsuario,
  toggleEstadoUsuario,
};
