const { Mensualidad, Usuario, Actividad, Clase, Plan } = require("../../db");

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
    const {
      usuario_id,
      actividad_id,
      clase_id,
      plan_id,
      periodo_inicio,
      periodo_fin,
      dia_vencimiento,
      monto,
    } = req.body;

    const mensualidad = await Mensualidad.create({
      usuario_id,
      actividad_id,
      clase_id,
      plan_id,
      periodo_inicio,
      periodo_fin,
      dia_vencimiento,
      monto,
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
