const { Op } = require("sequelize");
const { MercadoPagoConfig, Preference } = require("mercadopago");
const { Pago, Cliente, Usuario } = require("../../../db");

const includes = [
  { model: Cliente, as: "cliente" },
  { model: Usuario, as: "recepcionista" },
];

const getAllPagos = async (req, res, next) => {
  try {
    const { cliente_email, origen, desde, hasta } = req.query;
    const where = {};
    if (cliente_email) where.cliente_email = cliente_email;
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
    if (pagos.length === 0) {
      return res.status(200).json({ message: "No se han encontrado pagos", data: [] });
    }
    return res.status(200).json(pagos);
  } catch (error) {
    return next(error);
  }
};

const createPago = async (req, res, next) => {
  try {
    const {
      cliente_email,
      recepcionista_email,
      origen,
      origen_id,
      monto,
      fecha,
      medio,
      mp_payment_id,
    } = req.body;

    if (monto <= 0) {
      return res.status(400).json({ message: "El monto del pago debe ser mayor a cero" });
    }

    const pago = await Pago.create({
      cliente_email,
      recepcionista_email,
      origen,
      origen_id,
      monto,
      fecha,
      medio,
      mp_payment_id,
    });
    return res.status(201).json({ message: "Pago registrado correctamente", data: pago });
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
        success: "http://localhost:4200",
        failure: "http://localhost:4200",
        pending: "http://localhost:4200",
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

const generarComprobante = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Mock
    if (id === 'error') {
      return res.status(500).json({ message: "Hubo un error al recuperar la informacion del pago." });
    }
    return res.status(200).json({ message: "Generar comprobante", id });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllPagos,
  createPago,
  createPreference,
  generarComprobante,
};
