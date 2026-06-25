const { Op } = require("sequelize");
const {
  ListaEspera,
  Clase,
  ReservaClase,
  InscripcionMensual,
  Usuario,
  Actividad,
  Sala,
  conn,
} = require("../../../db");
const httpError = require("../../utils/httpError");
const { sumarUnMes, getFechaHoyLocal } = require("../../utils/fechas");
const { notificarCupoDisponible } = require("../notificaciones/email.listaEspera.service");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cuenta las reservas ACTIVAS en una clase para una fecha dada (INDIVIDUAL)
 * o en promedio para el mes vigente (MENSUAL).
 */
const contarReservasActivas = async (claseId, tipo, fechaExacta, transaction) => {
  const { obtenerCuposOcupados } = require("./reservas.service");
  if (tipo === "INDIVIDUAL" && fechaExacta) {
    return obtenerCuposOcupados(claseId, fechaExacta, null, transaction);
  }
  const where = {
    clase_id: claseId,
    estado: { [Op.ne]: "CANCELADA" },
  };
  return ReservaClase.count({ where, transaction });
};

/**
 * Devuelve el siguiente cliente ESPERANDO en la cola para una clase/tipo/fecha.
 */
const includeEntradaCompleta = [
  {
    model: Clase,
    as: "clase",
    include: [
      { model: Actividad, as: "actividad" },
      { model: Sala, as: "sala", attributes: ["identificador"] },
    ],
  },
  { model: Usuario, as: "cliente", attributes: ["email", "nombre", "apellido"] },
];

/**
 * Valida que el cliente tenga un cupo NOTIFICADO vigente para confirmar o rechazar.
 */
const cargarEntradaNotificada = async (listaEsperaId, clienteEmail) => {
  const entrada = await ListaEspera.findByPk(listaEsperaId, {
    include: includeEntradaCompleta,
  });
  if (!entrada) throw httpError(404, "Entrada de lista de espera no encontrada");
  if (entrada.cliente_email !== clienteEmail) {
    throw httpError(403, "No tenés permiso para realizar esta acción");
  }
  if (entrada.estado !== "NOTIFICADO") {
    throw httpError(409, "No tenés un cupo pendiente de confirmación para esta clase");
  }



  return entrada;
};

const buscarPrimeroEnEspera = (claseId, tipo, fechaExacta, transaction) => {
  const where = { clase_id: claseId, tipo, estado: "ESPERANDO" };
  if (tipo === "INDIVIDUAL" && fechaExacta) where.fecha_exacta = fechaExacta;
  return ListaEspera.findOne({
    where,
    order: [["posicion", "ASC"]],
    include: [
      { model: Usuario, as: "cliente", attributes: ["email", "nombre", "apellido"] },
      { model: Clase, as: "clase", attributes: ["nombre"] },
    ],
    transaction,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Funciones exportadas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Anota a un cliente en la lista de espera.
 * Valida que el cupo esté efectivamente lleno antes de agregar.
 */
const anotarseEnLista = async (clienteEmail, claseId, tipo, fechaExacta = null) => {
  if (tipo === "INDIVIDUAL" && !fechaExacta) {
    throw httpError(400, "Para la lista individual se requiere fecha_exacta");
  }

  return conn.transaction(async (transaction) => {
    const clase = await Clase.findByPk(claseId, { transaction });
    if (!clase) throw httpError(404, "Clase no encontrada");
    if (!clase.activa) throw httpError(400, "La clase no está activa");

    // Verificar que el usuario no tenga ya una membresía mensual activa/vigente para esta clase
    const inscripcionVigente = await InscripcionMensual.findOne({
      where: {
        clase_id: claseId,
        cliente_email: clienteEmail,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] }
      },
      transaction
    });
    if (inscripcionVigente) {
      throw httpError(409, "Ya tenés una membresía mensual activa para esta clase.");
    }

    if (tipo === "INDIVIDUAL") {
      const { verificarConflictoReserva } = require("./clases.service");
      const conflicto = await verificarConflictoReserva(claseId, fechaExacta, clienteEmail);
      if (conflicto && conflicto.conflicto) {
        throw httpError(409, conflicto.mensaje);
      }
    }

    // Verificar que realmente esté llena
    if (tipo === "MENSUAL") {
      const { fechasDeClaseEnPeriodo } = require("./reservas.service");
      const hoy = getFechaHoyLocal();
      const fin = sumarUnMes(hoy);
      const fechasPeriodo = fechasDeClaseEnPeriodo(clase.dia_semana, hoy, fin);
      
      const { obtenerCuposOcupados } = require("./reservas.service");
      let hayAlMenosUnaLlena = false;
      for (const fecha of fechasPeriodo) {
        const ocupadas = await obtenerCuposOcupados(claseId, fecha, clienteEmail, transaction);
        if (ocupadas >= clase.cupo) {
          hayAlMenosUnaLlena = true;
          break;
        }
      }
      
      if (!hayAlMenosUnaLlena) {
        throw httpError(400, "La clase todavía tiene cupos disponibles. Podés realizar la reserva directamente.");
      }
    } else {
      const reservasActivas = await contarReservasActivas(claseId, tipo, fechaExacta, transaction);
      if (reservasActivas < clase.cupo) {
        throw httpError(400, "La clase todavía tiene cupos disponibles. No es necesario anotarse en la lista de espera.");
      }
    }


    const whereExistente = { clase_id: claseId, cliente_email: clienteEmail, tipo, estado: "ESPERANDO" };
    if (tipo === "INDIVIDUAL" && fechaExacta) whereExistente.fecha_exacta = fechaExacta;
    const existente = await ListaEspera.findOne({ where: whereExistente, transaction });
    if (existente) {
      throw httpError(409, "Ya estás en la lista de espera para esta clase.");
    }

    // Calcular la posición (último + 1)
    const wherePos = { clase_id: claseId, tipo, estado: { [Op.in]: ["ESPERANDO", "NOTIFICADO"] } };
    if (tipo === "INDIVIDUAL" && fechaExacta) wherePos.fecha_exacta = fechaExacta;
    const ultimo = await ListaEspera.findOne({
      where: wherePos,
      order: [["posicion", "DESC"]],
      transaction,
    });
    const posicion = ultimo ? ultimo.posicion + 1 : 1;

    const entrada = await ListaEspera.create({
      clase_id: claseId,
      cliente_email: clienteEmail,
      tipo,
      fecha_exacta: tipo === "INDIVIDUAL" ? fechaExacta : null,
      estado: "ESPERANDO",
      posicion,
    }, { transaction });

    return entrada;
  });
};

/**
 * Notifica al primer cliente ESPERANDO en la cola que se liberó un cupo.
 * Llamado automáticamente después de cada cancelación.
 * Verifica que haya cupo real antes de notificar para evitar race conditions.
 */
const notificarPrimero = async (claseId, tipo, fechaExacta = null) => {
  return conn.transaction(async (transaction) => {
    const entrada = await buscarPrimeroEnEspera(claseId, tipo, fechaExacta, transaction);
    if (!entrada) return null; // Cola vacía

    // Verificar que realmente hay cupo disponible antes de notificar.
    // Esto evita que dos llamadas concurrentes noten a dos personas distintas
    // cuando solo se liberó un lugar.
    const clase = await Clase.findByPk(claseId, { attributes: ["cupo"], transaction });
    if (!clase) return null;

    const { obtenerCuposOcupados } = require("./reservas.service");
    if (tipo === "INDIVIDUAL" && fechaExacta) {
      const activas = await obtenerCuposOcupados(claseId, fechaExacta, entrada.cliente_email, transaction);
      if (activas >= clase.cupo) return null; // Sin cupo real, no notificar
    } else if (tipo === "MENSUAL") {
      const { fechasDeClaseEnPeriodo } = require("./reservas.service");
      const claseCompleta = await Clase.findByPk(claseId, { attributes: ["cupo", "dia_semana"], transaction });
      if (!claseCompleta) return null;
      const hoy = getFechaHoyLocal();
      const fin = sumarUnMes(hoy);
      const fechas = fechasDeClaseEnPeriodo(claseCompleta.dia_semana, hoy, fin);
      
      // Para mensualidad, se requiere que TODAS las fechas del periodo tengan cupo disponible
      let todasTienenCupo = true;
      for (const f of fechas) {
        const activas = await obtenerCuposOcupados(claseId, f, entrada.cliente_email, transaction);
        if (activas >= claseCompleta.cupo) {
          todasTienenCupo = false;
          break;
        }
      }
      if (!todasTienenCupo) return null;
    }

    await entrada.update({
      estado: "NOTIFICADO",
      notificado_en: new Date(),
    }, { transaction });

    // Enviar email (sin bloquear la transacción si falla)
    setImmediate(() => {
      notificarCupoDisponible({
        email: entrada.cliente.email,
        nombre: entrada.cliente.nombre,
        nombreClase: entrada.clase.nombre,
        tipo,
        fechaExacta,
      });
    });

    return entrada;
  });
};



/**
 * Cron job: busca entradas en ESPERANDO de tipo INDIVIDUAL cuya fecha_exacta esté
 * a 7 días o menos de ocurrir, verifica si la clase tiene cupo (por cancelaciones de
 * mensuales que no se llenaron) y dispara notificarPrimero.
 */
const liberarCuposDiferidos = async () => {
  const hoyStr = getFechaHoyLocal();
  const hoy = new Date();
  const limite = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const limiteStr = formatter.format(limite);

  const pendientes = await ListaEspera.findAll({
    where: {
      tipo: "INDIVIDUAL",
      estado: "ESPERANDO",
      fecha_exacta: {
        [Op.gte]: hoyStr,
        [Op.lte]: limiteStr,
      }
    },
    include: [{ model: Clase, as: "clase" }],
    order: [["fecha_exacta", "ASC"], ["posicion", "ASC"]],
  });

  const procesadas = new Set();
  let liberados = 0;

  for (const entrada of pendientes) {
    const key = `${entrada.clase_id}-${entrada.fecha_exacta}`;
    if (procesadas.has(key)) continue;
    
    // Contamos reservas activas. Si hay cupo, disparamos la notificación
    const reservasActivas = await contarReservasActivas(entrada.clase_id, "INDIVIDUAL", entrada.fecha_exacta);
    if (reservasActivas < entrada.clase.cupo) {
      await notificarPrimero(entrada.clase_id, "INDIVIDUAL", entrada.fecha_exacta);
      procesadas.add(key); // Solo lo marcamos procesado si efectivamente procesamos la cola para esa clase/fecha
      liberados++;
    }
  }

  if (liberados > 0) {
    console.log(`[listaEspera.cron] ${liberados} cupos diferidos liberados a lista individual.`);
  }
};

/**
 * Permite a un recepcionista remover manualmente a un cliente de la lista.
 * Avanza la fila automáticamente.
 */
const removerDeListaManual = async (listaEsperaId) => {
  return conn.transaction(async (transaction) => {
    const entrada = await ListaEspera.findByPk(listaEsperaId, { transaction });
    if (!entrada) throw httpError(404, "Entrada de lista de espera no encontrada");
    if (!["ESPERANDO", "NOTIFICADO"].includes(entrada.estado)) {
      throw httpError(409, "Esta entrada ya no está activa");
    }

    const eraNotificado = entrada.estado === "NOTIFICADO";
    await entrada.update({ estado: "RECHAZADO" }, { transaction });

    // Solo avanzar la fila si era quien estaba notificado (tenía el cupo reservado)
    if (eraNotificado) {
      // Se ejecuta fuera de la transacción para que el commit ya esté hecho
      setImmediate(() => {
        notificarPrimero(entrada.clase_id, entrada.tipo, entrada.fecha_exacta);
      });
    }

    return { message: "Cliente removido de la lista de espera" };
  });
};

/**
 * Permite a un cliente salir de la lista de espera por su propia cuenta.
 * Verifica la propiedad de la entrada.
 */
const removerDeListaCliente = async (listaEsperaId, clienteEmail) => {
  return conn.transaction(async (transaction) => {
    const entrada = await ListaEspera.findByPk(listaEsperaId, { transaction });
    if (!entrada) throw httpError(404, "Entrada de lista de espera no encontrada");
    if (entrada.cliente_email !== clienteEmail) {
      throw httpError(403, "No tenés permiso para realizar esta acción");
    }
    if (!["ESPERANDO", "NOTIFICADO"].includes(entrada.estado)) {
      throw httpError(409, "Esta entrada ya no está activa");
    }

    const eraNotificado = entrada.estado === "NOTIFICADO";
    await entrada.update({ estado: "RECHAZADO" }, { transaction });

    if (eraNotificado) {
      setImmediate(() => {
        notificarPrimero(entrada.clase_id, entrada.tipo, entrada.fecha_exacta);
      });
    }

    return { message: "Te removiste de la lista de espera correctamente." };
  });
};

/**
 * Cupos NOTIFICADOS pendientes de decisión para el cliente logueado.
 * Excluye entradas donde el cliente ya tiene una reserva ACTIVA en esa
 * clase/fecha (p.ej. si canceló y volvió a reservar, o si el cupo ya fue
 * confirmado por otro camino).
 */
const obtenerPendientesCliente = async (clienteEmail) => {
  const pendientes = await ListaEspera.findAll({
    where: {
      cliente_email: clienteEmail,
      estado: "NOTIFICADO",
    },
    include: includeEntradaCompleta,
    order: [["notificado_en", "ASC"]],
  });

  // Filtrar entradas donde el cliente ya tiene una reserva ACTIVA
  // (p.ej. canceló la original, fue notificado, y ahora tiene otra activa)
  const filtradas = await Promise.all(
    pendientes.map(async (entrada) => {
      const where = {
        clase_id: entrada.clase_id,
        cliente_email: clienteEmail,
        estado: "ACTIVA",
      };
      // Para individuales, verificar la fecha exacta puntual
      if (entrada.tipo === "INDIVIDUAL" && entrada.fecha_exacta) {
        where.fecha_exacta = entrada.fecha_exacta;
      } else if (entrada.tipo === "MENSUAL") {
        // Para mensuales, solo filtrar si la reserva activa es por membresía mensual
        where.inscripcion_mensual_id = { [Op.ne]: null };
      }
      const reservaActiva = await ReservaClase.findOne({ where });
      return reservaActiva ? null : entrada;
    })
  );

  return filtradas.filter(Boolean);
};

/**
 * Obtiene las entradas activas (ESPERANDO, NOTIFICADO) para el cliente logueado.
 */
const obtenerEntradasCliente = async (clienteEmail) => {
  return ListaEspera.findAll({
    where: {
      cliente_email: clienteEmail,
      estado: { [Op.in]: ["ESPERANDO", "NOTIFICADO"] },
    },
    include: includeEntradaCompleta,
    order: [["createdAt", "ASC"]],
  });
};

const confirmarCupo = async (listaEsperaId, clienteEmail, options = {}) => {
  const { crearInscripcionIndividual } = require("./inscripcionesIndividuales.service");
  const { crearInscripcionMensual } = require("./inscripcionesMensuales.service");
  const { tipoPago, vencimiento_seña, valeId } = options;

  const entrada = await cargarEntradaNotificada(listaEsperaId, clienteEmail);
  const clase = entrada.clase;
  const actividad = clase?.actividad;
  if (!clase || !actividad) {
    throw httpError(500, "No se pudo obtener la información de la clase");
  }

  let reservaId = null;
  let montoPagado = 0;
  let inscripcionMensualId = null;
  let inscripcionIndividualId = null;

  if (entrada.tipo === "INDIVIDUAL") {
    const modalidad = tipoPago === "SEÑA" ? "SEÑA" : "COMPLETO";
    const montoTotal = Number(actividad.precio) * 0.333;
    const data = {
      cliente_email: clienteEmail,
      clase_id: clase.id,
      actividad_id: actividad.id,
      fecha: entrada.fecha_exacta,
      modalidad,
      monto_total: montoTotal,
      vale_id: valeId || null,
    };
    if (modalidad === "SEÑA") {
      data.estado_seña = "PENDIENTE";
      data.vencimiento_seña = vencimiento_seña;
      data.monto_pagado = Number(montoTotal) / 2;
    } else {
      data.monto_pagado = montoTotal;
    }

    const inscripcion = await crearInscripcionIndividual(data);
    reservaId = inscripcion.reservas?.[0]?.id ?? null;
    montoPagado = Number(inscripcion.monto_pagado ?? 0);
    inscripcionIndividualId = inscripcion.id;
  } else {
    const periodoInicio = getFechaHoyLocal();
    const periodoFin = sumarUnMes(periodoInicio);
    const inscripcion = await crearInscripcionMensual({
      cliente_email: clienteEmail,
      actividad_id: actividad.id,
      clase_id: clase.id,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      dia_vencimiento: periodoFin,
      monto: actividad.precio,
      estado: "VIGENTE",
      vale_id: valeId || null,
    });
    reservaId = inscripcion.reservas?.[0]?.id ?? null;
    montoPagado = Number(inscripcion.monto ?? 0);
    inscripcionMensualId = inscripcion.id;
  }

  await entrada.update({ estado: "CONFIRMADO" });

  return {
    message: "Reserva confirmada con éxito",
    reservaId,
    clase_id: clase.id,
    monto_pagado: montoPagado,
    inscripcion_mensual_id: inscripcionMensualId,
    inscripcion_individual_id: inscripcionIndividualId,
  };
};

/**
 * El cliente rechaza el cupo liberado: se remueve de la lista y avanza la fila.
 */
const rechazarCupo = async (listaEsperaId, clienteEmail) => {
  const entrada = await cargarEntradaNotificada(listaEsperaId, clienteEmail);

  await entrada.update({ estado: "RECHAZADO" });

  setImmediate(() => {
    notificarPrimero(entrada.clase_id, entrada.tipo, entrada.fecha_exacta);
  });

  return {
    message: "Has rechazado el cupo correctamente",
    clase_id: entrada.clase_id,
  };
};

/**
 * Lista los clientes en espera (global o filtrada por clase).
 */
const listarListaEspera = async ({ clase_id, tipo, fecha_exacta } = {}) => {
  const where = {
    estado: { [Op.in]: ["ESPERANDO", "NOTIFICADO"] },
  };
  if (clase_id) where.clase_id = clase_id;
  if (tipo) where.tipo = tipo;
  if (tipo === "INDIVIDUAL" && fecha_exacta) where.fecha_exacta = fecha_exacta;

  return ListaEspera.findAll({
    where,
    order: [["clase_id", "ASC"], ["posicion", "ASC"]],
    include: [
      { model: Usuario, as: "cliente", attributes: ["email", "nombre", "apellido", "dni"] },
      { model: Clase, as: "clase", attributes: ["id", "nombre", "dia_semana", "hora_inicio"] },
    ],
  });
};

/**
 * Lista los clientes en espera para una clase (para visualización del recepcionista).
 */
const getListaEspera = async (claseId, tipo, fechaExacta = null) => {
  const where = {
    clase_id: claseId,
    estado: { [Op.in]: ["ESPERANDO", "NOTIFICADO"] },
  };
  if (tipo) where.tipo = tipo;
  if (tipo === "INDIVIDUAL" && fechaExacta) where.fecha_exacta = fechaExacta;

  return ListaEspera.findAll({
    where,
    order: [["posicion", "ASC"]],
    include: [
      { model: Usuario, as: "cliente", attributes: ["email", "nombre", "apellido"] },
    ],
  });
};

module.exports = {
  anotarseEnLista,
  notificarPrimero,
  liberarCuposDiferidos,
  removerDeListaManual,
  removerDeListaCliente,
  obtenerPendientesCliente,
  obtenerEntradasCliente,
  confirmarCupo,
  rechazarCupo,
  listarListaEspera,
  getListaEspera,
};
