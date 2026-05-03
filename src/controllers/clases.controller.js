const { Op } = require("sequelize");
const { Clase, Actividad, Sala } = require("../../db");

const getAllClases = async (_req, res, next) => {
  try {
    const clases = await Clase.findAll({
      where: { activa: true },
      include: [
        { model: Actividad, as: "actividad" },
        { model: Sala, as: "sala" },
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
    const {
      nombre,
      dia_semana,
      hora_inicio,
      hora_fin,
      cupo,
      actividad_id,
      sala_id,
    } = req.body;

    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) {
      return res.status(400).json({ message: "La actividad indicada no existe" });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(400).json({ message: "La sala indicada no existe" });
    }
    if (!sala.estado_activo) {
      return res.status(400).json({ message: "La sala se encuentra deshabilitada" });
    }

    const solapada = await Clase.findOne({
      where: {
        sala_id,
        dia_semana,
        activa: true,
        hora_inicio: { [Op.lt]: hora_fin },
        hora_fin: { [Op.gt]: hora_inicio },
      },
    });
    if (solapada) {
      return res.status(409).json({
        message:
          "Ya hay una clase agendada en la sala, día y horario seleccionados",
      });
    }

    const clase = await Clase.create({
      nombre,
      dia_semana,
      hora_inicio,
      hora_fin,
      cupo,
      actividad_id,
      sala_id,
    });

    return res.status(201).json({
      message: "La clase fue agendada exitosamente",
      clase,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllClases,
  createClase,
};
