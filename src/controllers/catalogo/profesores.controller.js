const { Op } = require("sequelize");
const { Profesor, Actividad, Clase } = require("../../../db");
const { crearProfesor } = require("../../services/catalogo/profesores.service");

const createProfesor = async (req, res, next) => {
  try {
    const { nombre, apellido, dni, telefono, email, actividades } = req.body;

    // Conflicto real: ya existe un profesor ACTIVO (no borrado) con ese DNI.
    const existingProfesor = await Profesor.findOne({ where: { dni } });
    if (existingProfesor) {
      return res.status(409).json({
        message: "El profesor con este número de documento ya se encuentra registrado",
      });
    }

    if (!actividades || actividades.length === 0) {
      return res.status(400).json({
        message: "El profesor debe dictar al menos una actividad",
      });
    }

    if (!telefono || !telefono.trim()) {
      return res.status(400).json({
        message: "El teléfono no puede estar vacío",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "El email no puede estar vacío",
      });
    }

    // Si existe un profesor BORRADO (soft-delete) con ese DNI, su fila sigue
    // ocupando el índice único del DNI y bloquearía el alta con un 409. En vez de
    // fallar, lo restauramos y lo pisamos con los datos nuevos (reutilizamos el
    // registro como un alta nueva).
    const profesorEliminado = await Profesor.findOne({
      where: { dni },
      paranoid: false,
    });

    let nuevoProfesor;
    if (profesorEliminado) {
      await profesorEliminado.restore();
      await profesorEliminado.update({ nombre, apellido, telefono, email, activo: true });
      nuevoProfesor = profesorEliminado;
    } else {
      nuevoProfesor = await crearProfesor({ nombre, apellido, dni, telefono, email });
    }

    await nuevoProfesor.setActividades(actividades);

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
    const { nombre, apellido, dni, telefono, email, activo, actividades } = req.body;

    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({ message: "Profesor no encontrado" });
    }

    if (telefono !== undefined && (!telefono || !telefono.trim())) {
      return res.status(400).json({ message: "El teléfono no puede estar vacío" });
    }

    if (email !== undefined && (!email || !email.trim())) {
      return res.status(400).json({ message: "El email no puede estar vacío" });
    }

    if (dni && dni !== profesor.dni) {
      const existingProfesor = await Profesor.findOne({ where: { dni } });
      if (existingProfesor && existingProfesor.id !== parseInt(id)) {
        return res.status(409).json({
          message: "El profesor con este número de documento ya se encuentra registrado",
        });
      }
    }

    if (actividades !== undefined && actividades.length === 0) {
      return res.status(400).json({
        message: "El profesor debe dictar al menos una actividad",
      });
    }

    if (actividades !== undefined) {
      const actividadesActuales = await profesor.getActividades({ attributes: ["id", "nombre"] });
      const nuevasIds = actividades.map((a) => Number(a));
      const quitadas = actividadesActuales.filter((a) => !nuevasIds.includes(a.id));

      if (quitadas.length > 0) {
        const conflictivas = await Clase.findAll({
          where: {
            profesor_id: profesor.id,
            activa: true,
            actividad_id: { [Op.in]: quitadas.map((a) => a.id) },
          },
          include: [{ model: Actividad, as: "actividad", attributes: ["nombre"] }],
        });

        if (conflictivas.length > 0) {
          const nombres = [...new Set(conflictivas.map((c) => c.actividad?.nombre).filter(Boolean))];
          return res.status(409).json({
            message: `No se puede quitar la actividad ${nombres.join(", ")}: el profesor tiene clases activas asignadas`,
          });
        }
      }
    }

    await profesor.update({ nombre, apellido, dni, telefono, email, activo });

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
    await profesor.setActividades([]);
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
          where: { activa: true },
          required: false,
          through: { attributes: [] }, // No traer atributos de la tabla intermedia
        },
      ],
      order: [
        ["apellido", "ASC"],
        ["nombre", "ASC"],
      ],
    });

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
