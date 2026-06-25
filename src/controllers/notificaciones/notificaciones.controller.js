const notificacionesService = require("../../services/notificaciones/notificaciones.service");

const getMisNotificaciones = async (req, res, next) => {
  try {
    const prefs = await notificacionesService.obtenerPreferencias(req.usuario.email);
    return res.status(200).json(prefs);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

const updateMisNotificaciones = async (req, res, next) => {
  try {
    const resultado = await notificacionesService.actualizarPreferencias(req.usuario.email, req.body);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

const updatePreferenciasCliente = async (req, res, next) => {
  try {
    const resultado = await notificacionesService.actualizarPreferencias(req.params.email, req.body);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

const notificarManual = async (req, res, next) => {
  try {
    const resultado = await notificacionesService.enviarNotificacionManual(req.body);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

module.exports = {
  getMisNotificaciones,
  updateMisNotificaciones,
  updatePreferenciasCliente,
  notificarManual,
};
