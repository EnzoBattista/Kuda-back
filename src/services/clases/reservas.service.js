const { Op } = require("sequelize");
const {
  ReservaClase,
  InscripcionMensual,
  InscripcionIndividual,
  CancelacionClase,
  Vale,
  Clase,
  Actividad,
  conn,
} = require("../../../db");
const httpError = require("../../utils/httpError");
const { notificarPrimero } = require("./listaEspera.service");

// ─── Constantes ──────────────────────────────────────────────────────────────

const HORAS_ANTICIPACION = 24;

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
    throw httpError(400, "Ya se cuenta con una reserva activa para esta clase");
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

  const fechasSinCancelar = fechas.filter((f) => !setCanceladas.has(f));
  if (fechasSinCancelar.length === 0) {
    throw httpError(
      409,
      "No hay fechas disponibles para la clase en el período (todas canceladas o período sin ocurrencias)"
    );
  }

  // Saltea fechas donde el mismo cliente ya tiene una reserva activa
  // (típicamente una individual previa): mantiene esa reserva y agrega
  // solo las restantes como mensuales.
  const yaReservadas = await ReservaClase.findAll({
    where: {
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: { [Op.in]: fechasSinCancelar },
      estado: "ACTIVA",
    },
    attributes: ["fecha_exacta"],
    transaction,
  });
  const setYaReservadas = new Set(
    yaReservadas.map((r) => String(r.fecha_exacta).slice(0, 10))
  );
  const fechasValidas = fechasSinCancelar.filter((f) => !setYaReservadas.has(f));

  if (fechasValidas.length === 0) {
    throw httpError(
      409,
      "Ya tenés reservas activas para todas las fechas de esta clase en el período"
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
 * Genera el cupón de descuento para un cliente abonado que cancela con +24hs.
 * Reglas:
 *  - Monto = monto pagado de la mensualidad / cantidad de clases del período.
 *    Para un mes "normal" de 4 clases da 25%; de 5 clases da 20%.
 *  - Validez: solo durante el mes siguiente (mes calendario).
 *  - Atado a la misma clase (clase_id) y al cliente.
 *
 * Si el cliente no usa el cupón en el mes siguiente, vence y se pierde
 * automáticamente al pasar la fecha valido_hasta.
 */
const generarValeAbonado = async (clienteEmail, claseId, inscripcionMensual, options = {}) => {
  const totalReservas = await ReservaClase.count({
    where: { inscripcion_mensual_id: inscripcionMensual.id },
    transaction: options.transaction,
  });
  if (totalReservas <= 0) return null;

  const montoVale = Number(inscripcionMensual.monto) / totalReservas;
  const hoy = new Date();
  const validoDesde = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const validoHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

  return Vale.create({
    cliente_email: clienteEmail,
    clase_id: claseId,
    tipo: "MENSUAL",
    monto: Number(montoVale.toFixed(2)),
    valido_desde: validoDesde.toISOString().slice(0, 10),
    valido_hasta: validoHasta.toISOString().slice(0, 10),
  }, options);
};

/**
 * Cupón TIPO INDIVIDUAL: 33.3% del valor de la actividad. Atado a la misma
 * clase; aplicable a la próxima inscripción INDIVIDUAL de esa clase. Validez
 * por defecto: hasta el último día del mes siguiente.
 */
const generarValeIndividual = async (clienteEmail, claseId, options = {}) => {
  const clase = await Clase.findByPk(claseId, {
    include: [{ model: Actividad, as: "actividad" }],
    transaction: options.transaction,
  });
  const precio = Number(clase?.actividad?.precio ?? 0);
  if (precio <= 0) return null;

  const montoVale = precio * 0.333;
  const hoy = new Date();
  const validoDesde = hoy.toISOString().slice(0, 10);
  const validoHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0)
    .toISOString()
    .slice(0, 10);

  return Vale.create({
    cliente_email: clienteEmail,
    clase_id: claseId,
    tipo: "INDIVIDUAL",
    monto: Number(montoVale.toFixed(2)),
    valido_desde: validoDesde,
    valido_hasta: validoHasta,
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
    if (!reserva) throw httpError(404, "No se encontraron reservas");
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
    let mensaje = "";

    // Determinar el origen usando las FKs
    if (reserva.inscripcion_mensual_id) {
      // Abonado + cancelación con +24hs ⇒ cupón para mensualidad del mes siguiente.
      if (conAnticipacion) {
        const inscripcion = await InscripcionMensual.findByPk(reserva.inscripcion_mensual_id, { transaction });
        if (inscripcion) {
          vale = await generarValeAbonado(emailUsuario, reserva.clase_id, inscripcion, { transaction });
        }
      }
      mensaje = "la cancelación se realizó con éxito";
    } else if (reserva.inscripcion_individual_id) {
      // Individual + cancelación con +24hs ⇒ cupón TIPO INDIVIDUAL (33.3% del
      // valor de la actividad) para la próxima reserva en esta clase.
      // <24hs ⇒ sin cupón, el centro retiene lo abonado.
      const inscripcion = await InscripcionIndividual.findByPk(reserva.inscripcion_individual_id, { transaction });
      if (conAnticipacion) {
        if (inscripcion) {
          await inscripcion.update({ estado_seña: null }, { transaction });
        }
        vale = await generarValeIndividual(emailUsuario, reserva.clase_id, { transaction });
        mensaje = "Clase cancelada con exito.";
      } else {
        mensaje = "Clase cancelada con exito.";
      }
    } else {
      mensaje = "Clase cancelada con exito.";
    }

    // Mantengo reembolso=false por compatibilidad (la HU ahora usa cupones).
    const resultado = { reserva, vale, reembolso: false, mensaje };
    return resultado;
  });
};

// Después del commit, notificar a la lista de espera sin bloquear el response
const cancelarReservaConNotificacion = async (reservaId, emailUsuario) => {
  const resultado = await cancelarReserva(reservaId, emailUsuario);

  // Disparar notificación de lista de espera de forma async (no bloquea ni propaga errores)
  setImmediate(async () => {
    try {
      const { reserva } = resultado;
      if (reserva.inscripcion_mensual_id) {
        await notificarPrimero(reserva.clase_id, "MENSUAL");
      } else if (reserva.inscripcion_individual_id) {
        await notificarPrimero(reserva.clase_id, "INDIVIDUAL", reserva.fecha_exacta);
      }
    } catch (err) {
      console.error("[cancelarReserva] Error al notificar lista de espera:", err.message);
    }
  });

  return resultado;
};

module.exports = {
  fechasDeClaseEnPeriodo,
  generarReservasIndividual,
  generarReservasMensual,
  cancelarReserva: cancelarReservaConNotificacion,
};
