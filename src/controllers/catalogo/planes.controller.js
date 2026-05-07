const { Plan, Actividad } = require("../../../db");

const includes = [{ model: Actividad, as: "actividad" }];

const getAllPlanes = async (req, res, next) => {
  try {
    const { actividad_id, tipo, activo } = req.query;
    const where = {};
    if (actividad_id) where.actividad_id = actividad_id;
    if (tipo) where.tipo = tipo;
    if (activo !== undefined) where.activo = activo === "true";

    const planes = await Plan.findAll({ where, include: includes });
    return res.status(200).json(planes);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllPlanes,
};
