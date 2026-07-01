const asistenciasService = require("../../services/asistencias/asistencias.service");
const { Rol } = require("../../../db");
const { ROLES } = require("../../constants/roles");

const esStaffAsistencia = (rolNombre) =>
  rolNombre === ROLES.DUEÑO || rolNombre === ROLES.RECEPCIONISTA;

const getHistorial = async (req, res, next) => {
  try {
    const rol = await Rol.findByPk(req.usuario.rol_id, { attributes: ["nombre"] });
    const rolNombre = rol?.nombre ?? "";
    const esStaff = esStaffAsistencia(rolNombre);

    const items = await asistenciasService.listarHistorial({
      usuarioEmail: req.usuario.email,
      rolNombre,
      esStaff,
    });

    if (items.length === 0) {
      return res.status(200).json({
        message: esStaff
          ? "No hay registros de asistencia."
          : "Aún no asistió a ninguna clase.",
        items: [],
      });
    }

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};

const escanearQr = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "QR no es válido." });
    }

    const datos = await asistenciasService.confirmarIngresoPorQr(token, req.usuario.email);
    return res.status(200).json(datos);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const registrarAsistencia = async (req, res, next) => {
  try {
    const { reserva_id, email, clase_id, estado, motivo_denegado } = req.body;

    if (!reserva_id || !email || !clase_id || !estado) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const resultado = await asistenciasService.registrarAsistencia(
      { reserva_id, email, clase_id, estado, motivo_denegado },
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

const getClasesHoy = async (req, res, next) => {
  try {
    const data = await asistenciasService.listarClasesHoy();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHistorial,
  escanearQr,
  registrarAsistencia,
  getClasesHoy,
};
