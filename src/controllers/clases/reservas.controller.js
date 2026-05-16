const { Op } = require("sequelize");
const { ReservaClase, Clase, Actividad, Profesor, Sala, Vale } = require("../../../db");
const { cancelarReserva } = require("../../services/clases/reservas.service");
const { toReservaDTO } = require("../../dtos/reservas.dto");

const getReservasActivas = async (req, res, next) => {
  try {
    const { cliente_email, actividad_id, clase_id } = req.query;
    const hoy = new Date().toISOString().slice(0, 10);

    const where = {
      estado: "ACTIVA",
      fecha_exacta: { [Op.gte]: hoy },
    };
    if (cliente_email) where.cliente_email = cliente_email;
    if (clase_id) where.clase_id = clase_id;

    const includeClase = {
      model: Clase,
      as: "clase",
      include: [
        { model: Actividad, as: "actividad" },
        { model: Profesor, as: "profesor" },
        { model: Sala, as: "sala" },
      ],
    };
    if (actividad_id) {
      includeClase.where = { actividad_id };
      includeClase.required = true;
    }

    const reservas = await ReservaClase.findAll({
      where,
      include: [includeClase],
      order: [["fecha_exacta", "ASC"]],
    });

    return res.status(200).json(reservas.map(toReservaDTO));
  } catch (error) {
    return next(error);
  }
};

const getHistorialReservas = async (req, res, next) => {
  try {
    const { cliente_email, desde, hasta, actividad_id, page = 1, limit = 20 } = req.query;
    const hoy = new Date().toISOString().slice(0, 10);

    const where = {
      [Op.or]: [
        { estado: "CANCELADA" },
        { fecha_exacta: { [Op.lt]: hoy } },
      ],
    };
    if (cliente_email) where.cliente_email = cliente_email;
    if (desde) where.fecha_exacta = { ...where.fecha_exacta, [Op.gte]: desde };
    if (hasta) where.fecha_exacta = { ...where.fecha_exacta, [Op.lte]: hasta };

    const includeClase = {
      model: Clase,
      as: "clase",
      include: [
        { model: Actividad, as: "actividad" },
        { model: Profesor, as: "profesor" },
        { model: Sala, as: "sala" },
      ],
    };
    if (actividad_id) {
      includeClase.where = { actividad_id };
      includeClase.required = true;
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await ReservaClase.findAndCountAll({
      where,
      include: [includeClase],
      order: [["fecha_exacta", "DESC"]],
      limit: Number(limit),
      offset,
    });

    return res.status(200).json({
      total: count,
      pagina: Number(page),
      paginas: Math.ceil(count / Number(limit)),
      reservas: rows.map(toReservaDTO),
    });
  } catch (error) {
    return next(error);
  }
};

const cancelarReservaController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emailUsuario = req.usuario.email;

    const resultado = await cancelarReserva(id, emailUsuario);

    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

const getMisVales = async (req, res, next) => {
  try {
    const cliente_email = req.usuario.email;
    const hoy = new Date().toISOString().slice(0, 10);

    const vales = await Vale.findAll({
      where: {
        cliente_email,
        valido_hasta: { [Op.gte]: hoy },
        usado_en_pago_id: null,
      },
      order: [["valido_hasta", "ASC"]],
    });

    return res.status(200).json(vales);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getReservasActivas,
  getHistorialReservas,
  cancelarReservaController,
  getMisVales,
};
