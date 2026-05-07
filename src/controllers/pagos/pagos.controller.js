const { Op } = require("sequelize");
const { MercadoPagoConfig, Preference } = require("mercadopago");
const { Pago, Usuario } = require("../../../db");

const includes = [
  { model: Usuario, as: "usuario" },
  { model: Usuario, as: "recepcionista" },
];

const getAllPagos = async (req, res, next) => {
  try {
    const { usuario_id, origen, desde, hasta } = req.query;
    const where = {};
    if (usuario_id) where.usuario_id = usuario_id;
    if (origen) where.origen = origen;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }

    const pagos = await Pago.findAll({
      where,
      include: includes,
      order: [["fecha", "DESC"]],
    });
    return res.status(200).json(pagos);
  } catch (error) {
    return next(error);
  }
};

const createPago = async (req, res, next) => {
  try {
    const {
      usuario_id,
      recepcionista_id,
      origen,
      origen_id,
      monto,
      fecha,
      medio,
      mp_payment_id,
    } = req.body;

    const pago = await Pago.create({
      usuario_id,
      recepcionista_id,
      origen,
      origen_id,
      monto,
      fecha,
      medio,
      mp_payment_id,
    });
    return res.status(201).json(pago);
  } catch (error) {
    return next(error);
  }
};

const createPreference = async (req, res, next) => {
  try {
    const { tituloPlan, precio } = req.body;

    if (!tituloPlan || precio === undefined || Number(precio) <= 0) {
      return res.status(400).json({
        error: "Debe enviar tituloPlan y precio válido",
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: "Falta configurar MP_ACCESS_TOKEN en variables de entorno",
      });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const preferenceClient = new Preference(client);

    const bodyData = {
      items: [
        {
          title: tituloPlan,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(precio),
        },
      ],
      back_urls: {
        success: "http://127.0.0.1:4200",
        failure: "http://127.0.0.1:4200",
        pending: "http://127.0.0.1:4200",
      },
    };

    const preference = await preferenceClient.create({ body: bodyData });

    return res.status(201).json({
      id: preference.id,
      init_point: preference.init_point,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllPagos,
  createPago,
  createPreference,
};
