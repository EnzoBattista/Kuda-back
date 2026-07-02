const { InscripcionMensual, Cliente, Actividad, Clase, ReservaClase, Pago, Sala } = require("../../../db");
const { Op } = require("sequelize");
const { finDeMesCalendario } = require("../../utils/fechas");
const {
  crearInscripcionMensual,
  actualizarInscripcionMensual,
} = require("../../services/clases/inscripcionesMensuales.service");
const { enriquecerInscripcionMensual } = require("../../services/clases/mensualidadesLifecycle.service");
const { crearPagoMercadoPago } = require("../../services/pagos/pagos.service");
const { getDiasGraciaMensual } = require("../../services/sistema/configuracion.service");

const includes = [
  { model: Cliente, as: "cliente" },
  { model: Actividad, as: "actividad" },
  { model: Clase, as: "clase", include: [{ model: Sala, as: "sala" }] },
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

    const diasGracia = await getDiasGraciaMensual();
    const enriquecidas = await Promise.all(
      inscripciones.map((ins) => enriquecerInscripcionMensual(ins, diasGracia)),
    );

    return res.status(200).json(enriquecidas);
  } catch (error) {
    return next(error);
  }
};

const getInscripcionMensualById = async (req, res, next) => {
  try {
    const inscripcion = await InscripcionMensual.findByPk(req.params.id, { include: includes });
    if (!inscripcion) return res.status(404).json({ message: "Inscripción mensual no encontrada" });
    const enriquecida = await enriquecerInscripcionMensual(inscripcion);
    return res.status(200).json(enriquecida);
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

    const periodo_fin = finDeMesCalendario(periodo_inicio);

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
    // Un mes precargado impago (PENDIENTE_PAGO / EN_GRACIA) puede cancelarse: como
    // no fue abonado, no se reintegra nada. Sus reservas impagas se liberan en el
    // servicio sin generar vales.
    await actualizarInscripcionMensual(inscripcion, { estado: "CANCELADA" });
    return res.status(200).json(inscripcion);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /inscripciones-mensuales/:id/pagar
 * Inicia pago MP sobre una mensualidad precargada (PENDIENTE_PAGO / EN_GRACIA).
 */
const pagarInscripcionMensual = async (req, res, next) => {
  try {
    const inscripcion = await InscripcionMensual.findByPk(req.params.id, {
      include: [{ model: Actividad, as: "actividad" }],
    });
    if (!inscripcion) return res.status(404).json({ message: "Inscripción mensual no encontrada" });

    if (!["PENDIENTE_PAGO", "EN_GRACIA"].includes(inscripcion.estado)) {
      return res.status(409).json({
        message: "Esta mensualidad no requiere pago o ya fue abonada",
      });
    }

    const clienteEmail = req.usuario?.email ?? req.body.cliente_email;
    if (inscripcion.cliente_email !== clienteEmail) {
      return res.status(403).json({ message: "No tenés permiso para pagar esta mensualidad" });
    }

    const enriquecida = await enriquecerInscripcionMensual(inscripcion);
    if (!enriquecida.mostrar_pagar_mes) {
      return res.status(409).json({
        message: "El pago del mes siguiente estará disponible tras la última clase del período actual",
      });
    }

    const pagoPendiente = await Pago.findOne({
      where: {
        inscripcion_mensual_id: inscripcion.id,
        estado: "PENDIENTE",
      },
      order: [["id", "DESC"]],
    });
    if (pagoPendiente) {
      const { consultarEstadoPago } = require("../../services/pagos/pagos.service");
      const estado = await consultarEstadoPago(pagoPendiente.id, clienteEmail);
      if (estado.estado === "PENDIENTE") {
        return res.status(409).json({ message: "Ya tenés un pago pendiente para esta mensualidad" });
      }
    }

    const actividadNombre = inscripcion.actividad?.nombre ?? "Actividad";
    const titulo = `Mensualidad ${actividadNombre} — ${String(inscripcion.periodo_inicio).slice(0, 10)}`;

    const resultado = await crearPagoMercadoPago(
      {
        inscripcion_mensual_id: inscripcion.id,
        origen: "MENSUALIDAD",
        monto: Number(inscripcion.monto),
        tituloPlan: titulo,
        cliente_email: clienteEmail,
      },
      clienteEmail,
    );

    return res.status(201).json(resultado);
  } catch (error) {
    return next(error);
  }
};

/**
 * @deprecated Usar POST /:id/pagar sobre la mensualidad precargada.
 */
const renovarInscripcionMensual = async (req, res, next) => {
  try {
    const inscripcion = await InscripcionMensual.findByPk(req.params.id);
    if (!inscripcion) return res.status(404).json({ message: "Inscripción mensual no encontrada" });

    const pendiente = await InscripcionMensual.findOne({
      where: {
        inscripcion_anterior_id: inscripcion.id,
        estado: { [Op.in]: ["PENDIENTE_PAGO", "EN_GRACIA"] },
      },
    });

    if (pendiente) {
      req.params.id = String(pendiente.id);
      return pagarInscripcionMensual(req, res, next);
    }

    return res.status(409).json({
      message: "No hay mensualidad precargada para renovar. El mes siguiente se reserva automáticamente al abonar.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllInscripcionesMensuales,
  getInscripcionMensualById,
  createInscripcionMensual,
  cancelarInscripcionMensual,
  pagarInscripcionMensual,
  renovarInscripcionMensual,
};
