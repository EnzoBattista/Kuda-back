const { InscripcionMensual, Cliente, Actividad, Clase, ReservaClase } = require("../../../db");
const { sumarUnMes, sumarDias } = require("../../utils/fechas");
const {
  crearInscripcionMensual,
  actualizarInscripcionMensual,
} = require("../../services/clases/inscripcionesMensuales.service");

const includes = [
  { model: Cliente, as: "cliente" },
  { model: Actividad, as: "actividad" },
  { model: Clase, as: "clase" },
  { model: ReservaClase, as: "reservas", attributes: ["id", "fecha_exacta", "estado"] },
];

const getAllInscripcionesMensuales = async (req, res, next) => {
  try {
    const { cliente_email, estado } = req.query;
    const where = {};
    if (cliente_email) where.cliente_email = cliente_email;
    if (estado) where.estado = estado;

    const inscripciones = await InscripcionMensual.findAll({
      where,
      include: includes,
      order: [["periodo_inicio", "DESC"]],
    });
    return res.status(200).json(inscripciones);
  } catch (error) {
    return next(error);
  }
};

const getInscripcionMensualById = async (req, res, next) => {
  try {
    const inscripcion = await InscripcionMensual.findByPk(req.params.id, { include: includes });
    if (!inscripcion) return res.status(404).json({ message: "Inscripción mensual no encontrada" });
    return res.status(200).json(inscripcion);
  } catch (error) {
    return next(error);
  }
};

const createInscripcionMensual = async (req, res, next) => {
  try {
    const { cliente_email, actividad_id, clase_id, periodo_inicio, vale_id } = req.body;

    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) return res.status(404).json({ message: "Actividad no encontrada" });

    const clase = await Clase.findByPk(clase_id);
    if (!clase) return res.status(404).json({ message: "Clase no encontrada" });
    if (clase.actividad_id !== actividad.id) {
      return res.status(400).json({
        message: "La clase no pertenece a la actividad indicada",
      });
    }

    const periodo_fin = sumarUnMes(periodo_inicio);

    const inscripcion = await crearInscripcionMensual({
      cliente_email,
      actividad_id,
      clase_id,
      periodo_inicio,
      periodo_fin,
      dia_vencimiento: periodo_fin,
      monto: actividad.precio,
      estado: "VIGENTE",
      vale_id,
    });
    return res.status(201).json(inscripcion);
  } catch (error) {
    return next(error);
  }
};

const cancelarInscripcionMensual = async (req, res, next) => {
  try {
    const inscripcion = await InscripcionMensual.findByPk(req.params.id);
    if (!inscripcion) return res.status(404).json({ message: "Inscripción mensual no encontrada" });
    if (inscripcion.estado === "CANCELADA" || inscripcion.estado === "FINALIZADA") {
      return res.status(409).json({ message: `La inscripción ya está ${inscripcion.estado}` });
    }
    await actualizarInscripcionMensual(inscripcion, { estado: "CANCELADA" });
    return res.status(200).json(inscripcion);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /inscripciones-mensuales/:id/renovar
 * Crea una nueva inscripción para el siguiente período y genera sus reservas.
 */
const renovarInscripcionMensual = async (req, res, next) => {
  try {
    const inscripcion = await InscripcionMensual.findByPk(req.params.id);
    if (!inscripcion) return res.status(404).json({ message: "Inscripción mensual no encontrada" });

    const estadosNoRenovables = ["CANCELADA", "FINALIZADA"];
    if (estadosNoRenovables.includes(inscripcion.estado)) {
      return res
        .status(409)
        .json({ message: `No se puede renovar una inscripción en estado ${inscripcion.estado}` });
    }

    const nuevoPeriodoInicio = sumarDias(inscripcion.periodo_fin, 1);
    const nuevoPeriodoFin = sumarUnMes(nuevoPeriodoInicio);

    const actividad = await Actividad.findByPk(inscripcion.actividad_id);

    const nuevaInscripcion = await crearInscripcionMensual({
      cliente_email: inscripcion.cliente_email,
      actividad_id: inscripcion.actividad_id,
      clase_id: inscripcion.clase_id,
      periodo_inicio: nuevoPeriodoInicio,
      periodo_fin: nuevoPeriodoFin,
      dia_vencimiento: nuevoPeriodoFin,
      monto: actividad ? actividad.precio : inscripcion.monto,
      estado: "VIGENTE",
    });

    return res.status(201).json(nuevaInscripcion);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllInscripcionesMensuales,
  getInscripcionMensualById,
  createInscripcionMensual,
  cancelarInscripcionMensual,
  renovarInscripcionMensual,
};
