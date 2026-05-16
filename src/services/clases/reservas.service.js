const { Op } = require("sequelize");
const {
  ReservaClase,
  InscripcionMensual,
  InscripcionIndividual,
  CancelacionClase,
  Vale,
  Clase,
  conn,
} = require("../../../db");
const httpError = require("../../utils/httpError");

// ─── Constantes ──────────────────────────────────────────────────────────────

const HORAS_ANTICIPACION = 24;
const PORCENTAJE_VALE = 0.33;

// Clase.DIAS_SEMANA -> número de día JS en UTC (getUTCDay: domingo = 0).
const DIA_SEMANA_A_NUMERO = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
};

// ─── Helpers de fechas ───────────────────────────────────────────────────────

const aFechaUTC = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const aISO = (fecha) => fecha.toISOString().slice(0, 10);

/**
 * Todas las fechas (YYYY-MM-DD) que caen en `diaSemana` dentro del período
 * [inicio, fin). El fin se trata como exclusivo.
 */
const fechasDeClaseEnPeriodo = (diaSemana, periodoInicio, periodoFin) => {
  const objetivo = DIA_SEMANA_A_NUMERO[diaSemana];
  if (objetivo === undefined) {
    throw httpError(500, `Día de semana de la clase no reconocido: ${diaSemana}`);
  }

  const fin = aFechaUTC(periodoFin);
  const fechas = [];
  for (let d = aFechaUTC(periodoInicio); d < fin; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === objetivo) {
      fechas.push(aISO(d));
    }
  }
  return fechas;
};

// ─── Verificaciones de cupo y cancelación ────────────────────────────────────

const verificarCupo = async (clase, fechaExacta, transaction) => {
  const ocupadas = await ReservaClase.count({
    where: { clase_id: clase.id, fecha_exacta: fechaExacta, estado: "ACTIVA" },
    transaction,
  });
  if (ocupadas >= clase.cupo) {
    throw httpError(409, `Sin cupo en la clase para la fecha ${fechaExacta}`);
  }
};

// ─── Generación de reservas (creación de inscripciones) ──────────────────────

/**
 * 1 reserva: la fecha puntual de la inscripción individual.
 */
const generarReservasIndividual = async (inscripcion, clase, { transaction }) => {
  if (!clase.activa) {
    throw httpError(409, "La clase no está activa");
  }

  const fecha = String(inscripcion.fecha).slice(0, 10);

  const cancelada = await CancelacionClase.findOne({
    where: { clase_id: clase.id, fecha },
    transaction,
  });
  if (cancelada) {
    throw httpError(409, `La clase está cancelada en la fecha ${fecha}`);
  }

  const existente = await ReservaClase.findOne({
    where: {
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: "ACTIVA",
    },
    transaction,
  });
  if (existente) {
    throw httpError(400, "Ya tienes una reserva activa para esta clase en esta fecha");
  }

  await verificarCupo(clase, fecha, transaction);

  const reserva = await ReservaClase.create(
    {
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: "ACTIVA",
      inscripcion_individual_id: inscripcion.id,
    },
    { transaction }
  );
  return [reserva];
};

/**
 * N reservas: una por cada ocurrencia de la clase dentro del período pagado.
 * Estrategia fail-fast: si CUALQUIER fecha requerida no tiene cupo, no se crea
 * ninguna reserva y la inscripción se revierte.
 */
const generarReservasMensual = async (inscripcion, clase, { transaction }) => {
  if (!clase.activa) {
    throw httpError(409, "La clase no está activa");
  }

  const fechas = fechasDeClaseEnPeriodo(
    clase.dia_semana,
    inscripcion.periodo_inicio,
    inscripcion.periodo_fin
  );

  const canceladas = await CancelacionClase.findAll({
    where: { clase_id: clase.id, fecha: { [Op.in]: fechas } },
    attributes: ["fecha"],
    transaction,
  });
  const setCanceladas = new Set(
    canceladas.map((c) => String(c.fecha).slice(0, 10))
  );

  const fechasValidas = fechas.filter((f) => !setCanceladas.has(f));
  if (fechasValidas.length === 0) {
    throw httpError(
      409,
      "No hay fechas disponibles para la clase en el período (todas canceladas o período sin ocurrencias)"
    );
  }

  const sinCupo = [];
  for (const fecha of fechasValidas) {
    const ocupadas = await ReservaClase.count({
      where: { clase_id: clase.id, fecha_exacta: fecha, estado: "ACTIVA" },
      transaction,
    });
    if (ocupadas >= clase.cupo) {
      sinCupo.push(fecha);
    }
  }
  if (sinCupo.length > 0) {
    throw httpError(
      409,
      `Sin cupo en la clase para: ${sinCupo.join(", ")}. No se generó la inscripción.`
    );
  }

  const reservas = await ReservaClase.bulkCreate(
    fechasValidas.map((fecha) => ({
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: "ACTIVA",
      inscripcion_mensual_id: inscripcion.id,
    })),
    { transaction, validate: true }
  );
  return reservas;
};

// ─── Cancelación de reservas (lógica de vales/reembolso) ─────────────────────

/**
 * Calcula cuántas horas faltan desde ahora hasta fecha_exacta a la hora de inicio.
 */
const horasHastaClase = (fechaExacta, horaInicio) => {
  const ahora = new Date();
  const fechaClase = new Date(`${fechaExacta}T${horaInicio}`);
  return (fechaClase - ahora) / (1000 * 60 * 60);
};

/**
 * Genera el vale de descuento para un cliente abonado que cancela con +24hs.
 * El vale es válido durante el mes siguiente.
 */
const generarVale = async (clienteEmail, montoMensualidad, options = {}) => {
  const hoy = new Date();
  const validoDesde = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const validoHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

  return Vale.create({
    cliente_email: clienteEmail,
    monto: Number((montoMensualidad * PORCENTAJE_VALE).toFixed(2)),
    valido_desde: validoDesde.toISOString().slice(0, 10),
    valido_hasta: validoHasta.toISOString().slice(0, 10),
  }, options);
};

/**
 * Cancela una ReservaClase. Aplica la lógica de devolución/vale según:
 * - Inscripción MENSUAL: si +24hs genera Vale; si <24hs sin beneficio.
 * - Inscripción INDIVIDUAL: si +24hs reembolso; si <24hs sin beneficio.
 *
 * @param {number} reservaId
 * @param {string} emailUsuario
 * @returns {{ reserva, vale?, reembolso: boolean, mensaje: string }}
 */
const cancelarReserva = async (reservaId, emailUsuario) => {
  return conn.transaction(async (transaction) => {
    const reserva = await ReservaClase.findByPk(reservaId, {
      include: [{ model: Clase, as: "clase" }],
      transaction,
    });
    if (!reserva) throw httpError(404, "Reserva no encontrada");
    if (reserva.cliente_email !== emailUsuario) {
      throw httpError(403, "No tenés permiso para cancelar esta reserva");
    }
    if (reserva.estado === "CANCELADA") {
      throw httpError(409, "La reserva ya está cancelada");
    }

    const horas = horasHastaClase(reserva.fecha_exacta, reserva.clase.hora_inicio);

    if (horas < 0) {
      throw httpError(400, "No se puede cancelar una clase que ya comenzó o finalizó");
    }

    const conAnticipacion = horas >= HORAS_ANTICIPACION;

    reserva.estado = "CANCELADA";
    await reserva.save({ transaction });

    let vale = null;
    let reembolso = false;
    let mensaje = "";

    // Determinar el origen usando las FKs
    if (reserva.inscripcion_mensual_id) {
      if (conAnticipacion) {
        const inscripcion = await InscripcionMensual.findByPk(reserva.inscripcion_mensual_id, { transaction });
        if (inscripcion) {
          vale = await generarVale(emailUsuario, inscripcion.monto, { transaction });
        }
        mensaje = "Cancelación exitosa con reembolso";
      } else {
        mensaje = "Cancelación exitosa sin reembolso";
      }
    } else if (reserva.inscripcion_individual_id) {
      const inscripcion = await InscripcionIndividual.findByPk(reserva.inscripcion_individual_id, { transaction });

      if (conAnticipacion) {
        if (inscripcion) {
          await inscripcion.update({ estado_seña: null }, { transaction });

          const hoy = new Date();
          const validoDesde = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
          const validoHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

          vale = await Vale.create({
            cliente_email: emailUsuario,
            monto: Number(inscripcion.monto_pagado),
            valido_desde: validoDesde.toISOString().slice(0, 10),
            valido_hasta: validoHasta.toISOString().slice(0, 10),
          }, { transaction });
        }
        reembolso = true;
        mensaje = "Cancelación exitosa con reembolso";
      } else {
        mensaje = "Cancelación exitosa sin reembolso";
      }
    }

    return { reserva, vale, reembolso, mensaje };
  });
};

module.exports = {
  fechasDeClaseEnPeriodo,
  generarReservasIndividual,
  generarReservasMensual,
  cancelarReserva,
};
