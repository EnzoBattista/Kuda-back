const { PagoClaseIndividual, Usuario, Clase, Plan } = require("../../db");

const includes = [
  { model: Usuario, as: "usuario" },
  { model: Clase, as: "clase" },
  { model: Plan, as: "plan" },
];

const getAllClasesIndividuales = async (req, res, next) => {
  try {
    const { usuario_id, modalidad, estado_seña } = req.query;
    const where = {};
    if (usuario_id) where.usuario_id = usuario_id;
    if (modalidad) where.modalidad = modalidad;
    if (estado_seña) where.estado_seña = estado_seña;

    const items = await PagoClaseIndividual.findAll({
      where,
      include: includes,
      order: [["fecha", "DESC"]],
    });
    return res.status(200).json(items);
  } catch (error) {
    return next(error);
  }
};

const getClaseIndividualById = async (req, res, next) => {
  try {
    const item = await PagoClaseIndividual.findByPk(req.params.id, { include: includes });
    if (!item) return res.status(404).json({ message: "Pago de clase individual no encontrado" });
    return res.status(200).json(item);
  } catch (error) {
    return next(error);
  }
};

const createClaseIndividual = async (req, res, next) => {
  try {
    const { usuario_id, clase_id, plan_id, fecha, modalidad, vencimiento_seña } = req.body;

    const plan = await Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: "Plan no encontrado" });
    if (plan.tipo !== "INDIVIDUAL") {
      return res.status(400).json({ message: "El plan debe ser de tipo INDIVIDUAL" });
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

    const monto_total = plan.precio;
    const data = {
      usuario_id,
      clase_id,
      plan_id,
      fecha,
      modalidad,
      monto_total,
    };

    if (modalidad === "SEÑA") {
      data.estado_seña = "PENDIENTE";
      data.vencimiento_seña = vencimiento_seña;
      data.monto_pagado = Number(monto_total) / 2;
    } else {
      data.monto_pagado = monto_total;
    }

    const item = await PagoClaseIndividual.create(data);
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
};

const completarSeña = async (req, res, next) => {
  try {
    const item = await PagoClaseIndividual.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Pago de clase individual no encontrado" });
    if (item.modalidad !== "SEÑA") {
      return res.status(409).json({ message: "Este pago no es una seña" });
    }
    if (item.estado_seña !== "PENDIENTE") {
      return res.status(409).json({ message: `La seña está ${item.estado_seña}` });
    }
    item.estado_seña = "COMPLETADA";
    item.monto_pagado = item.monto_total;
    await item.save();
    return res.status(200).json(item);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllClasesIndividuales,
  getClaseIndividualById,
  createClaseIndividual,
  completarSeña,
};
