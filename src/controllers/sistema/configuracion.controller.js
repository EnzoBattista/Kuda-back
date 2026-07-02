const {
  obtenerConfiguracion,
  actualizarConfiguracion,
} = require("../../services/sistema/configuracion.service");

const getConfiguracion = async (_req, res, next) => {
  try {
    const config = await obtenerConfiguracion();
    return res.status(200).json(config);
  } catch (error) {
    return next(error);
  }
};

const patchConfiguracion = async (req, res, next) => {
  try {
    const config = await actualizarConfiguracion(req.body);
    return res.status(200).json(config);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getConfiguracion, patchConfiguracion };
