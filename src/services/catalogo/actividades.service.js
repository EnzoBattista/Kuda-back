const { Actividad, Clase, Profesor, InscripcionMensual, InscripcionIndividual } = require("../../../db");
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
  const { nombre, descripcion, precio, activa } = data;

  if (!nombre || !nombre.trim()) {
    throw httpError(400, "El nombre de la actividad no puede estar vacío");
  }

  if (precio !== undefined && precio <= 0) {
    throw httpError(400, "El precio de la actividad debe ser mayor a 0");
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

  return nuevaActividad;
};

const updateActividad = async (id, data) => {
  const { nombre, descripcion, activa } = data;

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

  await actividad.update({
    nombre: nombre || actividad.nombre,
    descripcion: descripcion !== undefined ? descripcion : actividad.descripcion,
    activa: activa !== undefined ? activa : actividad.activa,
  });

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

  const clasesActivas = await Clase.findAll({
    where: { actividad_id: id, activa: true },
    attributes: ["id"],
  });

  if (clasesActivas.length > 0) {
    throw httpError(409, "No se puede eliminar una actividad con clases asociadas");
  }

  await actividad.update({ activa: false });
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
