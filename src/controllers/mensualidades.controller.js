const { Mensualidad, Usuario, Actividad, Clase, Plan } = require("../../db");

const sumarUnMes = (fechaIso) => {
  const d = new Date(fechaIso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const includes = [
  { model: Usuario, as: "usuario" },
  { model: Actividad, as: "actividad" },
  { model: Clase, as: "clase" },
  { model: Plan, as: "plan" },
];

const getAllMensualidades = async (req, res, next) => {
  try {
    const { usuario_id, estado } = req.query;
    const where = {};
    if (usuario_id) where.usuario_id = usuario_id;
    if (estado) where.estado = estado;

    const mensualidades = await Mensualidad.findAll({
      where,
      include: includes,
      order: [["periodo_inicio", "DESC"]],
    });
    return res.status(200).json(mensualidades);
  } catch (error) {
    return next(error);
  }
};

const getMensualidadById = async (req, res, next) => {
  try {
    const mensualidad = await Mensualidad.findByPk(req.params.id, { include: includes });
    if (!mensualidad) return res.status(404).json({ message: "Mensualidad no encontrada" });
    return res.status(200).json(mensualidad);
  } catch (error) {
    return next(error);
  }
};

const createMensualidad = async (req, res, next) => {
  try {
    const { usuario_id, plan_id, clase_id, periodo_inicio } = req.body;

    const plan = await Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: "Plan no encontrado" });
    if (plan.tipo !== "MENSUAL") {
      return res.status(400).json({ message: "El plan debe ser de tipo MENSUAL" });
    }
    if (!plan.activo) {
      return res.status(400).json({ message: "El plan no está activo" });
    }

    const clase = await Clase.findByPk(clase_id);
    if (!clase) return res.status(404).json({ message: "Clase no encontrada" });
    if (clase.actividad_id !== plan.actividad_id) {
      return res.status(400).json({
        message: "La clase no pertenece a la actividad del plan",
      });
    }

    const periodo_fin = sumarUnMes(periodo_inicio);

    const mensualidad = await Mensualidad.create({
      usuario_id,
      plan_id,
      actividad_id: plan.actividad_id,
      clase_id,
      periodo_inicio,
      periodo_fin,
      dia_vencimiento: periodo_fin,
      monto: plan.precio,
      estado: "VIGENTE",
    });
    return res.status(201).json(mensualidad);
  } catch (error) {
    return next(error);
  }
};

const cancelarMensualidad = async (req, res, next) => {
  try {
    const mensualidad = await Mensualidad.findByPk(req.params.id);
    if (!mensualidad) return res.status(404).json({ message: "Mensualidad no encontrada" });
    if (mensualidad.estado === "CANCELADA" || mensualidad.estado === "FINALIZADA") {
      return res.status(409).json({ message: `Mensualidad ya está ${mensualidad.estado}` });
    }
    mensualidad.estado = "CANCELADA";
    await mensualidad.save();
    return res.status(200).json(mensualidad);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllMensualidades,
  getMensualidadById,
  createMensualidad,
  cancelarMensualidad,
};
