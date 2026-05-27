const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor } = require("../../../db");
const clasesService = require("../../services/clases/clases.service");

const getAllClases = async (_req, res, next) => {
  try {
    const clases = await Clase.findAll({
      where: { activa: true },
      include: [
        { model: Actividad, as: "actividad" },
        { model: Sala, as: "sala" },
        { model: Profesor, as: "profesor" },
      ],
      order: [
        ["dia_semana", "ASC"],
        ["hora_inicio", "ASC"],
      ],
    });
    if (clases.length === 0) {
      return res.status(200).json({ message: "No existen clases para mostrar.", data: [] });
    }
    return res.status(200).json(clases);
  } catch (error) {
    return next(error);
  }
};

const createClase = async (req, res, next) => {
  try {
    const data = req.body;
    const clase = await clasesService.crearClase(data);

    return res.status(201).json({
      message: "Clase agregada con éxito",
      clase,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const updateClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const { clase, huboEspera } = await clasesService.modificarClase(id, data);

    return res.status(200).json({
      message: "Clase modificada con éxito",
      clase,
      huboEspera,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const getClaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const clase = await clasesService.getClaseById(id);
    return res.status(200).json(clase);
  } catch (error) {
    return next(error);
  }
};

const deleteClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await clasesService.deleteClase(id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const cancelarFechaClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body; // { fecha, motivo }
    
    const cancelacion = await clasesService.cancelarFechaClase(id, data);
    
    return res.status(201).json({
      message: "La clase fue cancelada exitosamente",
      cancelacion,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllClases,
  createClase,
  updateClase,
  getClaseById,
  deleteClase,
  cancelarFechaClase,
};
