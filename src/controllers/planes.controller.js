const { Plan } = require("../../db");

const getAllPlanes = async (_req, res, next) => {
  try {
    const planes = await Plan.findAll();
    return res.status(200).json(planes);
  } catch (error) {
    return next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const { nombre, precio, duracion_dias } = req.body;
    const plan = await Plan.create({ nombre, precio, duracion_dias });
    return res.status(201).json(plan);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllPlanes,
  createPlan,
};
