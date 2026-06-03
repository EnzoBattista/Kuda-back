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
  getHorariosPopulares,
};
