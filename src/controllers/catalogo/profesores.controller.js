const { Op } = require("sequelize");
const { Profesor, Actividad, Clase } = require("../../../db");
const { crearProfesor } = require("../../services/catalogo/profesores.service");

const createProfesor = async (req, res, next) => {
  try {
    const { nombre, apellido, dni, actividades } = req.body;

    const existingProfesor = await Profesor.findOne({ where: { dni } });
    if (existingProfesor) {
      return res.status(409).json({
        message: "El profesor con este número de documento ya se encuentra registrado",
      });
    }

    const nuevoProfesor = await crearProfesor({
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

const updateProfesor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, activo, actividades } = req.body;

    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({ message: "Profesor no encontrado" });
    }

    if (dni && dni !== profesor.dni) {
      return res.status(400).json({
        message: "El DNI de los empleados no puede ser modificado",
      });
    }

    await profesor.update({ nombre, apellido, dni, activo });

    if (actividades !== undefined) {
      await profesor.setActividades(actividades);
    }

    return res.status(200).json({
      message: "Datos actualizados correctamente",
      profesor,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteProfesor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profesor = await Profesor.findByPk(id);

    if (!profesor) {
      return res.status(404).json({ message: "Profesor no encontrado" });
    }

    const clasesActivas = await Clase.count({
      where: { profesor_id: id, activa: true },
    });

    if (clasesActivas > 0) {
      return res.status(409).json({
        message: "No se pudo eliminar al profesor. Aun tiene clases pendientes",
      });
    }

    await profesor.update({ activo: false });
    await profesor.destroy();

    return res.status(200).json({
      message: "Profesor eliminado con éxito",
    });
  } catch (error) {
    return next(error);
  }
};

const getAllProfesores = async (req, res, next) => {
  try {
    const { nombre } = req.query;
    const where = {};

    if (nombre) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${nombre}%` } },
        { apellido: { [Op.iLike]: `%${nombre}%` } },
      ];
    }

    const profesores = await Profesor.findAll({
      where,
      include: [
        {
          model: Actividad,
          as: "actividades",
          through: { attributes: [] }, // No traer atributos de la tabla intermedia
        },
      ],
      order: [
        ["apellido", "ASC"],
        ["nombre", "ASC"],
      ],
    });

    if (profesores.length === 0) {
      return res.status(200).json({ message: "No hay profesores registrados actualmente en el sistema", data: [] });
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
      return res.status(200).json({
        message: "No existen profesores asociados a esta actividad",
        data: []
      });
    }

    return res.status(200).json(actividad.profesores);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProfesor,
  updateProfesor,
  deleteProfesor,
  getAllProfesores,
  getProfesoresByActividad,
};
