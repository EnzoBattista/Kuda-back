const reportesService = require("../../services/reportes/reportes.service");

const getTotalUsuarios = async (_req, res, next) => {
  try {
    const data = await reportesService.getTotalUsuarios();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getUsuariosNuevos = async (_req, res, next) => {
  try {
    const data = await reportesService.getUsuariosNuevos();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getIngresos = async (_req, res, next) => {
  try {
    const data = await reportesService.getIngresos();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getIngresosMensuales = async (req, res, next) => {
  try {
    const { anio, actividad_id } = req.query;
    const actividadId =
      actividad_id && actividad_id !== "all" && actividad_id !== "todas"
        ? Number(actividad_id)
        : null;
    const data = await reportesService.getIngresosMensuales({ anio, actividadId });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getHorariosSeleccionados = async (req, res, next) => {
  try {
    const { anio, actividad_id } = req.query;
    const actividadId =
      actividad_id && actividad_id !== "all" && actividad_id !== "todas"
        ? Number(actividad_id)
        : null;
    const data = await reportesService.getHorariosSeleccionados({ anio, actividadId });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getHorariosPopulares = async (_req, res, next) => {
  try {
    const data = await reportesService.getHorariosPopulares();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getTotalUsuarios,
  getUsuariosNuevos,
  getIngresos,
  getIngresosMensuales,
  getHorariosSeleccionados,
  getHorariosPopulares,
};
