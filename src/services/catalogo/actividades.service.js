const { Actividad, Clase, Profesor, InscripcionMensual, InscripcionIndividual, ReservaClase } = require("../../../db");
const httpError = require("../../utils/httpError");
const { Op } = require("sequelize");

const getAllActividades = async (soloActivas = false) => {
  const where = soloActivas ? { activa: true } : {};
  const actividades = await Actividad.findAll({
    where,
    order: [["nombre", "ASC"]],
  });
  return actividades;
};

const createActividad = async (data) => {
  const { nombre, descripcion, precio, activa, profesores } = data;

  if (!nombre || !nombre.trim()) {
    throw httpError(400, "El nombre de la actividad no puede estar vacío");
  }

  if (precio !== undefined && precio <= 0) {
    throw httpError(400, "El precio de la actividad debe ser mayor a cero");
  }

  const existente = await Actividad.findOne({ where: { nombre, activa: true } });
  if (existente) {
    throw httpError(409, "Ya existe una actividad con ese nombre");
  }

  const nuevaActividad = await Actividad.create({
    nombre,
    descripcion,
    precio,
    activa: activa !== undefined ? activa : true,
  });

  if (Array.isArray(profesores) && profesores.length > 0) {
    await nuevaActividad.setProfesores(profesores);
  }

  return nuevaActividad;
};

const updateActividad = async (id, data) => {
  const { nombre, descripcion, activa, profesores } = data;

  if (nombre !== undefined && !nombre.trim()) {
    throw httpError(400, "El nombre de la actividad no puede estar vacío");
  }

  const actividad = await Actividad.findByPk(id);
  if (!actividad) {
    throw httpError(404, "Actividad no encontrada");
  }

  if (nombre && nombre !== actividad.nombre) {
    const existente = await Actividad.findOne({ where: { nombre, activa: true } });
    if (existente) {
      throw httpError(409, "Ya existe una actividad con ese nombre");
    }
  }

  const nombreCambiado = nombre !== undefined && nombre !== actividad.nombre;
  const descripcionCambiada = descripcion !== undefined && descripcion !== actividad.descripcion;

  if (nombreCambiado || descripcionCambiada) {
    const reservasActivas = await ReservaClase.count({
      where: { estado: "ACTIVA" },
      include: [
        {
          model: Clase,
          as: "clase",
          where: { actividad_id: id },
          required: true,
          attributes: [],
        },
      ],
    });

    if (reservasActivas > 0) {
      if (nombreCambiado) {
        throw httpError(409, "No se puede modificar el nombre de una actividad con reservas vinculadas");
      } else {
        throw httpError(409, "No se puede modificar la descripción de una actividad con reservas vinculadas");
      }
    }
  }

  await actividad.update({
    nombre: nombre || actividad.nombre,
    descripcion: descripcion !== undefined ? descripcion : actividad.descripcion,
    activa: activa !== undefined ? activa : actividad.activa,
  });

  if (Array.isArray(profesores)) {
    await actividad.setProfesores(profesores);
  }

  return actividad;
};

const updatePrecio = async (id, nuevoPrecio) => {
  if (nuevoPrecio === undefined || nuevoPrecio <= 0) {
    throw httpError(400, "El precio debe ser mayor a cero");
  }

  const actividad = await Actividad.findByPk(id);
  if (!actividad) {
    throw httpError(404, "Actividad no encontrada");
  }

  await actividad.update({ precio: nuevoPrecio });

  return actividad;
};

const deleteActividad = async (id) => {
  const actividad = await Actividad.findByPk(id);
  if (!actividad) {
    throw httpError(404, "Actividad no encontrada");
  }

  const reservasActivas = await ReservaClase.count({
    where: { estado: "ACTIVA" },
    include: [
      {
        model: Clase,
        as: "clase",
        where: { actividad_id: id },
        required: true,
        attributes: [],
      },
    ],
  });

  if (reservasActivas > 0) {
    throw httpError(409, "No se puede eliminar una actividad con clientes inscriptos");
  }

  await actividad.update({ activa: false });
  await Clase.update({ activa: false }, { where: { actividad_id: id } });
  return { message: "Actividad eliminada con éxito" };
};

const getProfesoresPorActividad = async (id) => {
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
    throw httpError(404, "Actividad no encontrada");
  }

  return actividad.profesores;
};

module.exports = {
  getAllActividades,
  createActividad,
  updateActividad,
  updatePrecio,
  deleteActividad,
  getProfesoresPorActividad,
};
