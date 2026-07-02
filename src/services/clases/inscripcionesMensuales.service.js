const { Op } = require("sequelize");
const { InscripcionMensual, Clase, ReservaClase, CancelacionClase, InscripcionIndividual, Actividad, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { generarReservasMensual, fechasDeClaseEnPeriodo } = require("./reservas.service");
const { notificarPrimero } = require("./listaEspera.service");
const { aplicarVale } = require("../pagos/vales.service");
const { getFechaHoyLocal, sumarDias, finDeMesCalendario } = require("../../utils/fechas");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA", "PENDIENTE_PAGO"];

/**
 * Valida las reglas de negocio de una inscripción mensual antes de crear o actualizar.
 * @param {object} data
 * @param {number|null} inscripcionIdActual
 */
const validarInscripcionMensual = async (data, inscripcionIdActual = null) => {
  // 1. Estado válido
  if (data.estado !== undefined && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de inscripción no válido");
  }

  // 2. Rango de fechas coherente
  if (data.periodo_inicio && data.periodo_fin && data.periodo_fin <= data.periodo_inicio) {
    throw httpError(400, "periodo_fin debe ser posterior a periodo_inicio");
  }

  // 3. Detecta superposición de fechas en la MISMA clase (permite renovaciones
  // anticipadas sin pisarse). Un cliente puede tener mensualidades simultáneas
  // en distintas clases aunque sean de la misma actividad. Si todas las
  // reservas de la mensual existente están CANCELADA, se permite re-inscribirse.
  if (data.cliente_email && data.clase_id && data.periodo_inicio && data.periodo_fin) {
    const whereInscripcion = {
      cliente_email: data.cliente_email,
      clase_id: data.clase_id,
      estado: ["VIGENTE", "EN_GRACIA"],
      periodo_inicio: { [Op.lt]: data.periodo_fin },
      periodo_fin: { [Op.gt]: data.periodo_inicio },
    };
    if (inscripcionIdActual) {
      whereInscripcion.id = { [Op.ne]: inscripcionIdActual };
    }
    const overlapping = await InscripcionMensual.findOne({ where: whereInscripcion });
    if (overlapping) {
      const reservasActivas = await ReservaClase.count({
        where: { inscripcion_mensual_id: overlapping.id, estado: "ACTIVA" },
      });
      if (reservasActivas > 0) {
        throw httpError(
          400,
          "El cliente ya tiene una inscripción mensual vigente en esta clase para el período indicado"
        );
      }
    }
  }
};

/**
 * Crea la mensualidad del mes siguiente en PENDIENTE_PAGO para guardar cupo.
 * Idempotente: no duplica si ya existe una impaga consecutiva.
 */
const crearProximaMensualidadPendiente = async (inscripcionVigente, transaction = null) => {
  const run = async (tx) => {
    const vigente = inscripcionVigente.toJSON
      ? inscripcionVigente
      : inscripcionVigente;

    if (!["VIGENTE", "FINALIZADA"].includes(vigente.estado)) return null;

    const periodoInicio = sumarDias(String(vigente.periodo_fin).slice(0, 10), 1);
    const periodoFin = finDeMesCalendario(periodoInicio);

    const existente = await InscripcionMensual.findOne({
      where: {
        cliente_email: vigente.cliente_email,
        clase_id: vigente.clase_id,
        inscripcion_anterior_id: vigente.id,
        estado: { [Op.in]: ["PENDIENTE_PAGO", "EN_GRACIA"] },
      },
      transaction: tx,
    });
    if (existente) return existente;

    const solapamiento = await InscripcionMensual.findOne({
      where: {
        cliente_email: vigente.cliente_email,
        clase_id: vigente.clase_id,
        estado: { [Op.in]: ["PENDIENTE_PAGO", "EN_GRACIA", "VIGENTE"] },
        periodo_inicio: periodoInicio,
      },
      transaction: tx,
    });
    if (solapamiento) return null;

    const clase = await Clase.findByPk(vigente.clase_id, { transaction: tx });
    if (!clase || !clase.activa) return null;

    const actividad = await Actividad.findByPk(vigente.actividad_id, { transaction: tx });
    const monto = actividad ? Number(actividad.precio) : Number(vigente.monto);

    const proxima = await InscripcionMensual.create(
      {
        cliente_email: vigente.cliente_email,
        actividad_id: vigente.actividad_id,
        clase_id: vigente.clase_id,
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        dia_vencimiento: periodoFin,
        monto,
        estado: "PENDIENTE_PAGO",
        inscripcion_anterior_id: vigente.id,
      },
      { transaction: tx },
    );

    await generarReservasMensual(proxima, clase, {
      transaction: tx,
      estadoReserva: "PENDIENTE_PAGO",
    });

    return proxima;
  };

  if (transaction) return run(transaction);
  return conn.transaction(run);
};

/**
 * Crea la InscripcionMensual y genera automáticamente todas las
 * ReservaClase concretas para cada fecha del período usando transacciones.
 */
const crearInscripcionMensual = async (data) => {
  const { vale_id, ...datosInscripcion } = data;
  await validarInscripcionMensual(datosInscripcion);

  return conn.transaction(async (transaction) => {
    const { validarMoraCliente } = require("../asistencias/asistencias.service");
    try {
      await validarMoraCliente(datosInscripcion.cliente_email);
    } catch (err) {
      throw httpError(403, "Tu cuenta se encuentra suspendida por falta de pago. Regularizá tu situación para poder reservar.");
    }

    const clase = await Clase.findByPk(datosInscripcion.clase_id, { transaction });
    if (!clase) {
      throw httpError(404, "La clase no existe");
    }
    if (!clase.activa) {
      throw httpError(400, "La clase seleccionada se encuentra inactiva o dada de baja");
    }

    // Prorratea el monto según las fechas que efectivamente ocurrirán en el
    // período (descuenta las que están canceladas por el CEF). Si no hay
    // ninguna fecha disponible, no se permite la inscripción.
    const fechasPeriodo = fechasDeClaseEnPeriodo(
      clase.dia_semana,
      datosInscripcion.periodo_inicio,
      datosInscripcion.periodo_fin
    );
    if (fechasPeriodo.length === 0) {
      throw httpError(409, "El período seleccionado no tiene ocurrencias de la clase");
    }
    const canceladas = await CancelacionClase.findAll({
      where: { clase_id: clase.id, fecha: { [Op.in]: fechasPeriodo } },
      attributes: ["fecha"],
      transaction,
    });
    const setCanceladas = new Set(canceladas.map((c) => String(c.fecha).slice(0, 10)));
    const fechasEfectivas = fechasPeriodo.filter((f) => !setCanceladas.has(f));
    if (fechasEfectivas.length === 0) {
      throw httpError(
        409,
        "El período seleccionado no tiene clases disponibles (todas las fechas están canceladas)"
      );
    }

    // Buscar si el cliente ya tiene reservas individuales en este período para fusionarlas y descontar lo pagado
    const yaReservadas = await ReservaClase.findAll({
      where: {
        cliente_email: datosInscripcion.cliente_email,
        clase_id: clase.id,
        fecha_exacta: { [Op.in]: fechasEfectivas },
        estado: "ACTIVA",
        inscripcion_individual_id: { [Op.ne]: null },
      },
      include: [{ model: InscripcionIndividual, as: "inscripcionIndividual" }],
      transaction,
    });

    const setYaReservadas = new Set(yaReservadas.map((r) => String(r.fecha_exacta).slice(0, 10)));
    const fechasAInscribir = fechasEfectivas.filter((f) => !setYaReservadas.has(f));

    // Sumar el monto pagado de las individuales que se van a fusionar
    let descuentoUpgrade = 0;
    for (const r of yaReservadas) {
      if (r.inscripcionIndividual) {
        descuentoUpgrade += Number(r.inscripcionIndividual.monto_pagado);
      }
    }

    const { obtenerCuposOcupados } = require("./reservas.service");
    // Verificar cupos estrictos para las fechas nuevas a inscribir (Nueva regla de negocio)
    for (const fecha of fechasAInscribir) {
      const reservasActivas = await obtenerCuposOcupados(clase.id, fecha, datosInscripcion.cliente_email, transaction);
      if (reservasActivas >= clase.cupo) {
        throw httpError(
          409,
          "No hay cupo suficiente en todas las fechas del mes."
        );
      }
    }

    const montoBase = Number(datosInscripcion.monto);
    const montoProrrateado =
      fechasEfectivas.length === fechasPeriodo.length
        ? montoBase
        : Number(((montoBase / fechasPeriodo.length) * fechasEfectivas.length).toFixed(2));

    const montoFinalUpgrade = Math.max(0, montoProrrateado - descuentoUpgrade);

    const { monto_final: montoFinal } = await aplicarVale({
      vale_id,
      cliente_email: datosInscripcion.cliente_email,
      clase_id: clase.id,
      monto_base: montoFinalUpgrade,
      tipo_inscripcion: "MENSUAL",
      transaction,
    });

    const requierePago = montoFinal > 0;
    const estadoInscripcion = requierePago ? "PENDIENTE_PAGO" : "VIGENTE";

    const inscripcion = await InscripcionMensual.create(
      { ...datosInscripcion, monto: montoFinal, estado: estadoInscripcion },
      { transaction }
    );
    await generarReservasMensual(inscripcion, clase, {
      transaction,
      estadoReserva: requierePago ? "PENDIENTE_PAGO" : "ACTIVA",
    });

    // Si el usuario acaba de adquirir una mensualidad, removerlo de todas las listas de espera INDIVIDUALES para esta clase
    const { ListaEspera } = require("../../../db");
    const entradasIndividuales = await ListaEspera.findAll({
      where: {
        clase_id: clase.id,
        cliente_email: datosInscripcion.cliente_email,
        tipo: "INDIVIDUAL",
        estado: { [Op.in]: ["ESPERANDO", "NOTIFICADO"] }
      },
      transaction
    });

    if (entradasIndividuales.length > 0) {
      const { reordenarPosiciones, notificarPrimero } = require("./listaEspera.service");
      for (const entrada of entradasIndividuales) {
        const eraNotificado = entrada.estado === "NOTIFICADO";
        await entrada.update({ estado: "RECHAZADO" }, { transaction });
        await reordenarPosiciones(entrada.clase_id, entrada.tipo, entrada.fecha_exacta, transaction);
        if (eraNotificado) {
           setImmediate(() => {
              notificarPrimero(entrada.clase_id, entrada.tipo, entrada.fecha_exacta);
           });
        }
      }
    }

    return InscripcionMensual.findByPk(inscripcion.id, {
      include: [{ model: ReservaClase, as: "reservas" }],
      transaction,
    }).then(async (resultado) => {
      if (estadoInscripcion === "VIGENTE") {
        await crearProximaMensualidadPendiente(resultado, transaction);
      }
      return resultado;
    });
  });
};

/**
 * Actualiza una InscripcionMensual existente re-validando reglas de negocio.
 * Gestiona el ciclo de vida de las ReservaClase futuras según el tipo de cambio.
 */
const actualizarInscripcionMensual = async (inscripcion, data) => {
  const hoy = getFechaHoyLocal();
  const estadosCancelacion = ["CANCELADA", "SUSPENDIDA"];

  const estadoCambia = data.estado && estadosCancelacion.includes(data.estado);
  const fechasCambian = data.periodo_inicio !== undefined || data.periodo_fin !== undefined;
  const claseCambia = data.clase_id !== undefined && data.clase_id !== inscripcion.clase_id;

  // Solo validar superposición si cambian fechas o clase
  if (fechasCambian || claseCambia) {
    const dataAValidar = { ...inscripcion.toJSON(), ...data };
    await validarInscripcionMensual(dataAValidar, inscripcion.id);
  } else if (data.estado && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de inscripción no válido");
  }

  // Si se cancela por completo la mensualidad, cancelamos ordenadamente cada reserva a futuro
  // para que pasen por el flujo de reembolso (vale) si corresponde.
  if (data.estado === "CANCELADA" && inscripcion.estado !== "CANCELADA") {
    const { cancelarReserva } = require("./reservas.service");
    const reservasFuturas = await ReservaClase.findAll({
      where: {
        inscripcion_mensual_id: inscripcion.id,
        fecha_exacta: { [Op.gte]: hoy },
        estado: "ACTIVA"
      }
    });
    for (const r of reservasFuturas) {
      try {
        await cancelarReserva(r.id, inscripcion.cliente_email);
      } catch (err) {
        console.error(`[actualizarInscripcionMensual] Error al cancelar reserva ${r.id}:`, err.message);
      }
    }
  }

  const resultado = await conn.transaction(async (transaction) => {
    if (estadoCambia || fechasCambian || claseCambia) {
      // Eliminar reservas futuras existentes si es suspensión o cambio de parámetros (NO en cancelación que ya se cancelaron ordenadamente)
      if (data.estado !== "CANCELADA") {
        await ReservaClase.destroy({
          where: {
            inscripcion_mensual_id: inscripcion.id,
            fecha_exacta: { [Op.gte]: hoy },
          },
          transaction,
        });
      }

      // Si no es cancelación/suspensión, regenerar reservas con nuevos parámetros
      if (!estadoCambia && (fechasCambian || claseCambia)) {
        const claseIdFinal = data.clase_id ?? inscripcion.clase_id;
        const clase = await Clase.findByPk(claseIdFinal, { transaction });
        if (!clase) throw httpError(404, "La clase no existe");

        const inicioFinal = data.periodo_inicio ?? inscripcion.periodo_inicio;
        const finFinal = data.periodo_fin ?? inscripcion.periodo_fin;
        const inicioEfectivo = inicioFinal < hoy ? hoy : inicioFinal;

        // Crear un objeto pseudo-inscripción para reutilizar generarReservasMensual
        const pseudoInscripcion = {
          id: inscripcion.id,
          cliente_email: inscripcion.cliente_email,
          periodo_inicio: inicioEfectivo,
          periodo_fin: finFinal,
        };

        await generarReservasMensual(pseudoInscripcion, clase, { transaction });
      }
    }

    return inscripcion.update(data, { transaction });
  });

  // Si se canceló la inscripción mensual, notificar al primero de la lista de espera MENSUAL
  if (data.estado === "CANCELADA") {
    setImmediate(async () => {
      try {
        await notificarPrimero(inscripcion.clase_id, "MENSUAL");
      } catch (err) {
        console.error("[actualizarInscripcionMensual] Error al notificar lista de espera:", err.message);
      }
    });
  }

  return resultado;
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
  crearProximaMensualidadPendiente,
};
