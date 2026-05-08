const { Profesor, Actividad } = require("../../../db");

const createProfesor = async (req, res, next) => {
  try {
    const { nombre, apellido, dni, actividades } = req.body;

    const existingProfesor = await Profesor.findOne({ where: { dni } });
    if (existingProfesor) {
      return res.status(409).json({
        message: "El profesor con este número de documento ya se encuentra registrado",
      });
    }

    const nuevoProfesor = await Profesor.create({
      nombre,
      apellido,
      dni,
    });

    if (actividades && actividades.length > 0) {
      await nuevoProfesor.setActividades(actividades);
    }

    return res.status(201).json({
      message: "Profesor registrado con éxito",
      profesor: nuevoProfesor,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllProfesores = async (_req, res, next) => {
  try {
    const profesores = await Profesor.findAll({
      include: [
        {
          model: Actividad,
          as: "actividades",
          through: { attributes: [] }, // No traer atributos de la tabla intermedia
        },
      ],
      order: [["apellido", "ASC"], ["nombre", "ASC"]],
    });

    if (profesores.length === 0) {
      return res.status(404).json({
        message: "No hay profesores registrados actualmente en el sistema",
      });
    }

    return res.status(200).json(profesores);
  } catch (error) {
    return next(error);
  }
};

const getProfesoresByActividad = async (req, res, next) => {
  try {
    const { id } = req.params;

    const actividad = await Actividad.findByPk(id, {
      include: [
        {
          model: Profesor,
          as: "profesores",
          through: { attributes: [] },
        },
      ],
    });

    if (!actividad) {
      return res.status(404).json({ message: "La actividad indicada no existe" });
    }

    if (!actividad.profesores || actividad.profesores.length === 0) {
      return res.status(404).json({
        message: "No existen profesores asociados a esta actividad",
      });
    }

    return res.status(200).json(actividad.profesores);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProfesor,
  getAllProfesores,
  getProfesoresByActividad,
};
