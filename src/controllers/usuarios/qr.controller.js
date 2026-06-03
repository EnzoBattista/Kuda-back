const asistenciasService = require("../../services/asistencias/asistencias.service");

const getMiQr = async (req, res, next) => {
  try {
    const data = await asistenciasService.generarQrCliente(req.usuario.email);
    return res.status(200).json({
      message: "QR generado con éxito",
      ...data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = { getMiQr };
