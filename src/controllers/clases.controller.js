const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor } = require("../../db");
const clasesService = require("../services/clases.service");

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
      message: "La clase fue agendada exitosamente",
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

    const clase = await clasesService.modificarClase(id, data);

    return res.status(200).json({
      message: "Clase modificada exitosamente",
      clase,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  getAllClases,
  createClase,
  updateClase,
};
