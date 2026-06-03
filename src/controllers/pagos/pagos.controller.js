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

const registrarPago = async (req, res, next) => {
  try {
    const pago = await pagosService.registrarPagoManual(req.body, req.usuario.email);
    return res.status(201).json({
      message: "Pago registrado correctamente",
      data: pago,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const generarPagoQr = async (req, res, next) => {
  try {
    const resultado = await pagosService.generarPagoQr(req.body, req.usuario.email);
    return res.status(201).json({
      message: "Intención de pago QR generada",
      ...resultado,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const createPreference = async (req, res, next) => {
  try {
    const { tituloPlan, precio, cliente_email, external_reference } = req.body;

    if (!tituloPlan || precio === undefined) {
      return res.status(400).json({ error: "Debe enviar tituloPlan y precio válido" });
    }

    const preference = await pagosService.crearPreferenciaMercadoPago({
      tituloPlan,
      precio,
      cliente_email: cliente_email || req.usuario?.email,
      external_reference,
    });

    return res.status(201).json(preference);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message, error: error.message });
    }
    return next(error);
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
  registrarPago,
  generarPagoQr,
  createPreference,
  generarComprobante,
};
