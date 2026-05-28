const { Op } = require("sequelize");
const { InscripcionIndividual, InscripcionMensual, Clase, ReservaClase, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { generarReservasIndividual } = require("./reservas.service");
const { aplicarVale } = require("../pagos/vales.service");

const MODALIDADES = ["COMPLETO", "SEÑA"];
const ESTADOS_SEÑA = ["PENDIENTE", "COMPLETADA", "VENCIDA"];

const validarInscripcionIndividual = (data) => {
  if (data.modalidad !== undefined) {
    if (!MODALIDADES.includes(data.modalidad)) {
      throw httpError(400, "Modalidad no válida");
    }
    if (data.modalidad === "SEÑA") {
      if (!data.estado_seña || !data.vencimiento_seña) {
        throw httpError(400, "Una seña requiere estado_seña y vencimiento_seña");
      }
    } else if (data.modalidad === "COMPLETO") {
      if (data.estado_seña || data.vencimiento_seña) {
        throw httpError(400, "Pago COMPLETO no debe tener datos de seña");
      }
    }
  }

  if (data.estado_seña !== undefined && data.estado_seña !== null) {
    if (!ESTADOS_SEÑA.includes(data.estado_seña)) {
      throw httpError(400, "Estado de seña no válido");
    }
  }
};

/**
 * Crea la InscripcionIndividual y genera automáticamente la
 * ReservaClase concreta para la fecha de la clase, usando transacciones.
 */
const crearInscripcionIndividual = async (data) => {
  const { vale_id, ...datosInscripcion } = data;
  validarInscripcionIndividual(datosInscripcion);

  return conn.transaction(async (transaction) => {
    const clase = await Clase.findByPk(datosInscripcion.clase_id, { transaction });
    if (!clase) {
      throw httpError(404, "Clase no encontrada");
    }

    const fecha = String(datosInscripcion.fecha).slice(0, 10);
    // Solo bloquea si el cliente ya está abonado a ESTA misma clase y la
    // reserva de la mensual para esa fecha sigue activa. Si la reserva fue
    // cancelada (por cualquier motivo), se permite la inscripción individual.
    const abonoActivo = await InscripcionMensual.findOne({
      where: {
        cliente_email: datosInscripcion.cliente_email,
        clase_id: datosInscripcion.clase_id,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] },
        periodo_inicio: { [Op.lte]: fecha },
        periodo_fin: { [Op.gt]: fecha },
      },
      transaction,
    });
    if (abonoActivo) {
      const reservaActivaMensual = await ReservaClase.findOne({
        where: {
          inscripcion_mensual_id: abonoActivo.id,
          fecha_exacta: fecha,
          estado: "ACTIVA",
        },
        transaction,
      });
      if (reservaActivaMensual) {
        throw httpError(
          409,
          "Ya tenés un abono activo en esta clase, no podés reservar individualmente",
        );
      }
    }

    // Aplica cupón TIPO INDIVIDUAL si vino. Recomputa monto_pagado según
    // modalidad (COMPLETO = total, SEÑA = 50%).
    const { monto_final: montoTotalFinal, descuento } = await aplicarVale({
      vale_id,
      cliente_email: datosInscripcion.cliente_email,
      clase_id: clase.id,
      monto_base: Number(datosInscripcion.monto_total),
      tipo_inscripcion: "INDIVIDUAL",
      transaction,
    });
    const datosFinales = { ...datosInscripcion, monto_total: montoTotalFinal };
    if (descuento > 0) {
      datosFinales.monto_pagado =
        datosInscripcion.modalidad === "SEÑA"
          ? Number((montoTotalFinal / 2).toFixed(2))
          : montoTotalFinal;
    }

    const inscripcion = await InscripcionIndividual.create(datosFinales, { transaction });
    await generarReservasIndividual(inscripcion, clase, { transaction });

    return InscripcionIndividual.findByPk(inscripcion.id, {
      include: [{ model: ReservaClase, as: "reservas" }],
      transaction,
    });
  });
};

const actualizarInscripcionIndividual = async (inscripcion, data) => {
  validarInscripcionIndividual(data);
  return conn.transaction(async (transaction) => {
    return inscripcion.update(data, { transaction });
  });
};

module.exports = {
  validarInscripcionIndividual,
  crearInscripcionIndividual,
  actualizarInscripcionIndividual,
};
