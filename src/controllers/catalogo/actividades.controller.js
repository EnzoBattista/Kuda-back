const actividadesService = require("../../services/catalogo/actividades.service");

const getAllActividades = async (req, res, next) => {
  try {
    const { activa } = req.query;
    // Si envían ?activa=true, filtramos. Si no, devolvemos todo.
    const soloActivas = activa === "true";
    const actividades = await actividadesService.getAllActividades(soloActivas);
    if (actividades.length === 0) {
      return res.status(200).json({ message: "No hay actividades", data: [] });
    }
    return res.status(200).json(actividades);
  } catch (error) {
    return next(error);
  }
};

const createActividad = async (req, res, next) => {
  try {
    const nuevaActividad = await actividadesService.createActividad(req.body);
    return res.status(201).json({
      message: "Actividad agregada con éxito",
      actividad: nuevaActividad,
    });
  } catch (error) {
    return next(error);
  }
};

const updateActividad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actividad = await actividadesService.updateActividad(id, req.body);
    return res.status(200).json({
      message: "Actividad modificada con éxito",
      actividad,
    });
  } catch (error) {
    return next(error);
  }
};

const updatePrecio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { precio } = req.body;
    const actividad = await actividadesService.updatePrecio(id, precio);
    return res.status(200).json({
      message: "el precio fue actualizado correctamente",
      actividad,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteActividad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await actividadesService.deleteActividad(id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const getProfesoresPorActividad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profesores = await actividadesService.getProfesoresPorActividad(id);
    if (profesores.length === 0) {
      return res.status(200).json({ message: "No existen profesores asociados a esta actividad", data: [] });
    }
    return res.status(200).json(profesores);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllActividades,
  createActividad,
  updateActividad,
  updatePrecio,
  deleteActividad,
  getProfesoresPorActividad,
};
