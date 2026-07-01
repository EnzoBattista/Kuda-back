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
const { getFechaHoyLocal, getHoraLocal } = require("../../utils/fechas");

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

const ESTADOS_RESERVA_OCUPAN_CUPO = ["ACTIVA", "PENDIENTE_PAGO"];

const normalizarHoraCmp = (hora) => String(hora ?? "").slice(0, 8);

/** Dos franjas [inicio, fin) se solapan si comparten al menos un minuto. */
const horariosSeSolapan = (inicioA, finA, inicioB, finB) => {
  const a0 = normalizarHoraCmp(inicioA);
  const a1 = normalizarHoraCmp(finA);
  const b0 = normalizarHoraCmp(inicioB);
  const b1 = normalizarHoraCmp(finB);
  return a0 < b1 && a1 > b0;
};

/**
 * Otra reserva del cliente el mismo día que se superpone con la clase indicada.
 * Incluye ACTIVA y PENDIENTE_PAGO (checkout MP en curso).
 */
const buscarConflictoHorarioCliente = async ({
  clienteEmail,
  fecha,
  clase,
  excluirClaseId = null,
  transaction = undefined,
}) => {
  const fechaStr = String(fecha).slice(0, 10);
  const where = {
    cliente_email: clienteEmail,
    fecha_exacta: fechaStr,
    estado: { [Op.in]: ESTADOS_RESERVA_OCUPAN_CUPO },
  };
  if (excluirClaseId != null) {
    where.clase_id = { [Op.ne]: excluirClaseId };
  }

  const reservas = await ReservaClase.findAll({
    where,
    include: [
      {
        model: Clase,
        as: "clase",
        attributes: ["id", "hora_inicio", "hora_fin", "nombre"],
      },
    ],
    transaction,
  });

  return (
    reservas.find(
      (r) =>
        r.clase &&
        horariosSeSolapan(
          r.clase.hora_inicio,
          r.clase.hora_fin,
          clase.hora_inicio,
          clase.hora_fin,
        ),
    ) ?? null
  );
};

const obtenerCuposOcupados = async (claseId, fecha, clienteEmailExcluir, transaction, incluirEsperando = true) => {
  const { ReservaClase, InscripcionMensual } = require("../../../db");

  const whereReservas = {
    clase_id: claseId,
    fecha_exacta: fecha,
    estado: { [Op.in]: ESTADOS_RESERVA_OCUPAN_CUPO },
  };
  if (clienteEmailExcluir) {
    whereReservas.cliente_email = { [Op.ne]: clienteEmailExcluir };
  }
  const activas = await ReservaClase.count({ where: whereReservas, transaction });

  // Caso 1: abonados cuyo período CUBRE la fecha consultada (periodo_inicio <= fecha < periodo_fin).
  // Estos ya tienen reservas ACTIVA generadas, pero se verifica por si alguno no las tiene aún.
  const abonadosVigentes = await InscripcionMensual.findAll({
    where: {
      clase_id: claseId,
      estado: ["VIGENTE", "EN_GRACIA"],
      periodo_inicio: { [Op.lte]: fecha },
      periodo_fin: { [Op.gt]: fecha }
    },
    transaction
  });

  // Caso 2: abonados vigentes cuyo período termina ANTES de la fecha, pero cuyo mes de renovación
  // (periodo_fin → periodo_fin + 1 mes) SÍ incluye la fecha. Estos tienen preferencia de cupo
  // para la renovación y aún no han reservado concretamente esa fecha.
  const hoy = getFechaHoyLocal();
  const abonadosProximosARenovar = await InscripcionMensual.findAll({
    where: {
      clase_id: claseId,
      estado: ["VIGENTE", "EN_GRACIA"],
      periodo_fin: { [Op.gt]: hoy, [Op.lte]: fecha }
    },
    transaction
  });

  const emailsContados = new Set();
  let noRenovados = 0;

  for (const abono of [...abonadosVigentes, ...abonadosProximosARenovar]) {
    if (clienteEmailExcluir && abono.cliente_email === clienteEmailExcluir) continue;
    if (emailsContados.has(abono.cliente_email)) continue;

    const yaTieneReserva = await ReservaClase.findOne({
      where: {
        cliente_email: abono.cliente_email,
        clase_id: claseId,
        fecha_exacta: fecha,
        estado: "ACTIVA"
      },
      transaction
    });
    if (!yaTieneReserva) {
      noRenovados++;
      emailsContados.add(abono.cliente_email);
    }
  }

  // Caso 3: usuarios en lista de espera que están NOTIFICADOS (tienen el cupo bloqueado temporalmente)
  const { ListaEspera } = require("../../../db");
  const whereWaitlist = {
    clase_id: claseId,
    estado: incluirEsperando ? { [Op.in]: ["NOTIFICADO", "ESPERANDO"] } : "NOTIFICADO",
    [Op.or]: [
      { tipo: "INDIVIDUAL", fecha_exacta: fecha },
      { tipo: "MENSUAL" }
    ]
  };
  let notificados = await ListaEspera.count({ where: whereWaitlist, transaction });

  if (clienteEmailExcluir) {
    // Solo restamos 1 si este cliente en particular tiene un cupo bloqueado como NOTIFICADO
    const tieneNotificado = await ListaEspera.count({
      where: {
        clase_id: claseId,
        cliente_email: clienteEmailExcluir,
        estado: "NOTIFICADO",
        [Op.or]: [
          { tipo: "INDIVIDUAL", fecha_exacta: fecha },
          { tipo: "MENSUAL" }
        ]
      },
      transaction
    });
    if (tieneNotificado > 0) {
      if (incluirEsperando) {
        const cantidadEsperando = await ListaEspera.count({
          where: {
            clase_id: claseId,
            estado: "ESPERANDO",
            [Op.or]: [
              { tipo: "INDIVIDUAL", fecha_exacta: fecha },
              { tipo: "MENSUAL" }
            ]
          },
          transaction
        });
        notificados -= (tieneNotificado + cantidadEsperando);
      } else {
        notificados -= tieneNotificado;
      }
      notificados = Math.max(0, notificados);
    }
  }

  return activas + noRenovados + notificados;
};

const verificarCupo = async (clase, fechaExacta, clienteEmailExcluir, transaction) => {
  const ocupadas = await obtenerCuposOcupados(clase.id, fechaExacta, clienteEmailExcluir, transaction);
  if (ocupadas >= clase.cupo) {
    throw httpError(409, `Sin cupo en la clase para la fecha ${fechaExacta}`);
  }
};

// ─── Generación de reservas (creación de inscripciones) ──────────────────────

/**
 * 1 reserva: la fecha puntual de la inscripción individual.
 */
const generarReservasIndividual = async (inscripcion, clase, { transaction, estadoReserva = "ACTIVA" }) => {
  if (!clase.activa) {
    throw httpError(409, "La clase no está activa");
  }

  const fecha = String(inscripcion.fecha).slice(0, 10);
  const hoyStr = getFechaHoyLocal();
  const horaActual = getHoraLocal();

  if (fecha < hoyStr || (fecha === hoyStr && clase.hora_inicio < horaActual)) {
    throw httpError(400, "No se puede reservar una clase que ya pasó");
  }

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
      estado: { [Op.in]: ESTADOS_RESERVA_OCUPAN_CUPO },
    },
    transaction,
  });
  if (existente) {
    throw httpError(400, "Ya tenés una reserva activa para esta clase en esa fecha");
  }

  const conflictoHorario = await buscarConflictoHorarioCliente({
    clienteEmail: inscripcion.cliente_email,
    fecha,
    clase,
    excluirClaseId: clase.id,
    transaction,
  });
  if (conflictoHorario) {
    throw httpError(409, "Ya tenés una reserva activa en ese día y horario");
  }

  await verificarCupo(clase, fecha, inscripcion.cliente_email, transaction);

  const reserva = await ReservaClase.create(
    {
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: estadoReserva,
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
const generarReservasMensual = async (inscripcion, clase, { transaction, estadoReserva = "ACTIVA" }) => {
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
  // (típicamente una individual previa): las fusiona/convierte a mensuales
  // y crea el resto como nuevas.
  const yaReservadas = await ReservaClase.findAll({
    where: {
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: { [Op.in]: fechasSinCancelar },
      estado: "ACTIVA",
      inscripcion_individual_id: { [Op.ne]: null },
    },
    transaction,
  });

  // Convertir las individuales existentes a mensuales
  for (const r of yaReservadas) {
    r.inscripcion_mensual_id = inscripcion.id;
    r.inscripcion_individual_id = null;
    await r.save({ transaction });
  }

  const setYaReservadas = new Set(
    yaReservadas.map((r) => String(r.fecha_exacta).slice(0, 10))
  );
  const hoyStr = getFechaHoyLocal();
  const horaActual = getHoraLocal();
  const fechasValidas = fechasSinCancelar.filter((f) => {
    if (f < hoyStr) return false;
    if (f === hoyStr && clase.hora_inicio < horaActual) return false;
    return !setYaReservadas.has(f);
  });

  for (const fecha of fechasValidas) {
    const conflictoHorario = await buscarConflictoHorarioCliente({
      clienteEmail: inscripcion.cliente_email,
      fecha,
      clase,
      excluirClaseId: clase.id,
      transaction,
    });
    if (conflictoHorario) {
      throw httpError(
        409,
        "Ya tenés una reserva activa en ese día y horario"
      );
    }
  }

  const sinCupo = [];
  for (const fecha of fechasValidas) {
    const ocupadas = await obtenerCuposOcupados(clase.id, fecha, inscripcion.cliente_email, transaction);
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

  const reservasNuevas = await ReservaClase.bulkCreate(
    fechasValidas.map((fecha) => ({
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: estadoReserva,
      inscripcion_mensual_id: inscripcion.id,
    })),
    { transaction, validate: true }
  );
  return [...yaReservadas, ...reservasNuevas];
};

// ─── Cancelación de reservas (lógica de vales/reembolso) ─────────────────────

/**
 * Calcula cuántas horas faltan desde ahora hasta fecha_exacta a la hora de inicio.
 */
const horasHastaClase = (fechaExacta, horaInicio) => {
  const ahora = new Date();
  const fechaClase = new Date(`${fechaExacta}T${horaInicio}-03:00`);
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
  const hoyLocalStr = getFechaHoyLocal();
  const [year, month] = hoyLocalStr.split("-").map(Number);

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const validoDesdeStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  let monthAfter = nextMonth + 1;
  let yearAfter = nextYear;
  if (monthAfter > 12) {
    monthAfter = 1;
    yearAfter += 1;
  }
  const lastDayObj = new Date(Date.UTC(yearAfter, monthAfter - 1, 0));
  const validoHastaStr = lastDayObj.toISOString().slice(0, 10);

  return Vale.create({
    cliente_email: clienteEmail,
    clase_id: claseId,
    tipo: "MENSUAL",
    monto: Number(montoVale.toFixed(2)),
    valido_desde: validoDesdeStr,
    valido_hasta: validoHastaStr,
  }, options);
};

/**
 * Cupón TIPO INDIVIDUAL: 33.3% del valor de la actividad. Atado a la misma
 * clase; aplicable a la próxima inscripción INDIVIDUAL de esa clase. Validez
 * por defecto: hasta el último día del mes siguiente.
 */
const generarValeIndividual = async (clienteEmail, claseId, monto, options = {}) => {
  const validoDesdeStr = getFechaHoyLocal();
  const [year, month] = validoDesdeStr.split("-").map(Number);

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  let monthAfter = nextMonth + 1;
  let yearAfter = nextYear;
  if (monthAfter > 12) {
    monthAfter = 1;
    yearAfter += 1;
  }

  const lastDayObj = new Date(Date.UTC(yearAfter, monthAfter - 1, 0));
  const validoHastaStr = lastDayObj.toISOString().slice(0, 10);

  return Vale.create({
    cliente_email: clienteEmail,
    clase_id: claseId,
    tipo: "INDIVIDUAL",
    monto: Number(Number(monto).toFixed(2)),
    valido_desde: validoDesdeStr,
    valido_hasta: validoHastaStr,
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
      // Individual + cancelación con +24hs ⇒ cupón TIPO INDIVIDUAL para la próxima reserva en esta clase.
      // <24hs ⇒ sin cupón, el centro retiene lo abonado.
      const inscripcion = await InscripcionIndividual.findByPk(reserva.inscripcion_individual_id, { transaction });
      if (conAnticipacion) {
        let montoVale = 0;
        if (inscripcion) {
          await inscripcion.update({ estado_seña: null }, { transaction });
          montoVale = Number(inscripcion.monto_pagado);
        }
        vale = await generarValeIndividual(emailUsuario, reserva.clase_id, montoVale, { transaction });
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
      // Priorizar la lista de espera MENSUAL: intentamos notificar a un mensual primero.
      // Si se logra notificar (porque todas las fechas del mes pasan a tener cupo), no notificamos a la individual.
      const notificadoMensual = await notificarPrimero(reserva.clase_id, "MENSUAL");
      if (!notificadoMensual) {
        // Si no se notificó a nadie mensual (cola vacía o alguna fecha del mes sigue sin cupo),
        // notificamos a la lista INDIVIDUAL para la fecha exacta de esta reserva.
        await notificarPrimero(reserva.clase_id, "INDIVIDUAL", reserva.fecha_exacta);
      }
    } catch (err) {
      console.error("[cancelarReserva] Error al notificar lista de espera:", err.message);
    }
  });

  return resultado;
};

/**
 * Cancela automáticamente las reservas asociadas a señas pendientes
 * cuando faltan menos de 24 horas para la clase.
 */
const cancelarSeñasVencidas = async () => {
  return conn.transaction(async (transaction) => {
    const reservasConSeña = await ReservaClase.findAll({
      where: { estado: "ACTIVA" },
      include: [
        {
          model: InscripcionIndividual,
          as: "inscripcionIndividual",
          where: {
            modalidad: "SEÑA",
            estado_seña: "PENDIENTE"
          },
          required: true
        },
        {
          model: Clase,
          as: "clase",
          required: true
        }
      ],
      transaction
    });

    const reservasCanceladas = [];

    for (const reserva of reservasConSeña) {
      const horas = horasHastaClase(reserva.fecha_exacta, reserva.clase.hora_inicio);
      
      // Si faltan menos de 24 hs, se vence la seña y se cancela la reserva
      // Se chequea que horas >= 0 para no tocar clases pasadas (estas pasan a 'COMPLETADA' en front, pero por las dudas las salteamos o las incluimos, pero mejor solo futuras).
      // Bueno, si horas < 0, ya pasó la clase, debería haberse vencido antes.
      if (horas < HORAS_ANTICIPACION) {
        reserva.estado = "CANCELADA";
        await reserva.save({ transaction });

        const inscripcion = reserva.inscripcionIndividual;
        inscripcion.estado_seña = "VENCIDA";
        await inscripcion.save({ transaction });
        
        reservasCanceladas.push(reserva);
      }
    }

    return reservasCanceladas;
  });
};

const cancelarSeñasVencidasConNotificacion = async () => {
  let reservasCanceladas = [];
  try {
    reservasCanceladas = await cancelarSeñasVencidas();
  } catch (err) {
    console.error("[cancelarSeñasVencidas] Error al procesar señas vencidas:", err.message);
    return [];
  }

  for (const reserva of reservasCanceladas) {
    setImmediate(async () => {
      try {
        const notificadoMensual = await notificarPrimero(reserva.clase_id, "MENSUAL");
        if (!notificadoMensual) {
          await notificarPrimero(reserva.clase_id, "INDIVIDUAL", reserva.fecha_exacta);
        }
      } catch (err) {
        console.error("[cancelarSeñasVencidas] Error al notificar lista de espera:", err.message);
      }
    });
  }

  return reservasCanceladas;
};

module.exports = {
  ESTADOS_RESERVA_OCUPAN_CUPO,
  fechasDeClaseEnPeriodo,
  horariosSeSolapan,
  buscarConflictoHorarioCliente,
  generarReservasIndividual,
  generarReservasMensual,
  cancelarReserva: cancelarReservaConNotificacion,
  obtenerCuposOcupados,
  cancelarSeñasVencidas: cancelarSeñasVencidasConNotificacion,
};
