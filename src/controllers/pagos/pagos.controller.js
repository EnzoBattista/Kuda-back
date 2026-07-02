const pagosService = require("../../services/pagos/pagos.service");

const getAllPagos = async (req, res, next) => {
  try {
    const pagos = await pagosService.listarPagos(req.query);

    if (pagos.length === 0) {
      return res.status(200).json({ message: "No se han encontrado pagos", data: [] });
    }

    return res.status(200).json(pagos);
  } catch (error) {
    return next(error);
  }
};

const createPreference = async (req, res, next) => {
  try {
    const { tituloPlan, precio } = req.body;

    if (!tituloPlan || precio === undefined) {
      return res.status(400).json({ error: "Debe enviar tituloPlan y precio válido" });
    }

    const resultado = await pagosService.crearPagoMercadoPago(
      {
        ...req.body,
        cliente_email: req.body.cliente_email || req.usuario?.email,
      },
      req.usuario.email,
    );

    return res.status(201).json(resultado);
  } catch (error) {
    const message =
      error?.message || "No se pudo crear la preferencia de Mercado Pago";
    return res.status(error.status || 502).json({ message, error: message });
  }
};

const getEstadoPago = async (req, res, next) => {
  try {
    const estado = await pagosService.consultarEstadoPago(
      req.params.id,
      req.usuario.email,
    );
    return res.status(200).json(estado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const abandonarPago = async (req, res, next) => {
  try {
    const resultado = await pagosService.abandonarPago(
      req.params.id,
      req.usuario.email,
    );
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const liberarReservaPendiente = async (req, res, next) => {
  try {
    const resultado = await pagosService.liberarReservaPendiente(
      req.body,
      req.usuario.email,
    );
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const webhookMercadoPago = async (req, res) => {
  try {
    const resultado = await pagosService.procesarWebhookMercadoPago(req);
    return res.status(200).json(resultado);
  } catch {
    return res.status(200).json({ received: true });
  }
};

const generarComprobante = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comprobante = await pagosService.obtenerComprobante(id);
    return res.status(200).json(comprobante);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        message: "Hubo un error al recuperar la informacion del pago.",
      });
    }
    return next(error);
  }
};

module.exports = {
  getAllPagos,
  createPreference,
  getEstadoPago,
  abandonarPago,
  liberarReservaPendiente,
  webhookMercadoPago,
  generarComprobante,
};
