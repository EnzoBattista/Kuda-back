const { InscripcionIndividual, Cliente, Clase, Actividad } = require("../../../db");
const { crearInscripcionIndividual } = require("../../services/clases/inscripcionesIndividuales.service");

const includes = [
  { model: Cliente, as: "cliente" },
  { model: Clase, as: "clase" },
  { model: Actividad, as: "actividad" },
];

const getAllInscripcionesIndividuales = async (req, res, next) => {
  try {
    const { cliente_email, modalidad, estado_seña } = req.query;
    const where = {};
    if (cliente_email) where.cliente_email = cliente_email;
    if (modalidad) where.modalidad = modalidad;
    if (estado_seña) where.estado_seña = estado_seña;

    const items = await InscripcionIndividual.findAll({
      where,
      include: includes,
      order: [["fecha", "DESC"]],
    });
    return res.status(200).json(items);
  } catch (error) {
    return next(error);
  }
};

const getInscripcionIndividualById = async (req, res, next) => {
  try {
    const item = await InscripcionIndividual.findByPk(req.params.id, { include: includes });
    if (!item) return res.status(404).json({ message: "Inscripción individual no encontrada" });
    return res.status(200).json(item);
  } catch (error) {
    return next(error);
  }
};

const createInscripcionIndividual = async (req, res, next) => {
  try {
    const { cliente_email, actividad_id, clase_id, fecha, modalidad, vencimiento_seña, vale_id } = req.body;

    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) return res.status(404).json({ message: "Actividad no encontrada" });

    const clase = await Clase.findByPk(clase_id);
    if (!clase) return res.status(404).json({ message: "Clase no encontrada" });
    if (clase.actividad_id !== actividad.id) {
      return res.status(400).json({
        message: "La clase no pertenece a la actividad indicada",
      });
    }

    const monto_total = actividad.precio * 0.333;
    const data = {
      cliente_email,
      clase_id,
      actividad_id,
      fecha,
      modalidad,
      monto_total,
      vale_id,
    };

    if (modalidad === "SEÑA") {
      data.estado_seña = "PENDIENTE";
      data.vencimiento_seña = vencimiento_seña;
      data.monto_pagado = Number(monto_total) / 2;
    } else {
      data.monto_pagado = monto_total;
    }

    const item = await crearInscripcionIndividual(data);
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
};

const completarSeña = async (req, res, next) => {
  try {
    const item = await InscripcionIndividual.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Inscripción individual no encontrada" });
    if (item.modalidad !== "SEÑA") {
      return res.status(409).json({ message: "Esta inscripción no es una seña" });
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
  getAllInscripcionesIndividuales,
  getInscripcionIndividualById,
  createInscripcionIndividual,
  completarSeña,
};
