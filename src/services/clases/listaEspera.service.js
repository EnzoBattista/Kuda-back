const { Op } = require("sequelize");
const { ListaEspera, Clase, ReservaClase, InscripcionMensual, Usuario, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { notificarCupoDisponible, notificarExpiracion } = require("../notificaciones/email.listaEspera.service");

const HORAS_LIMITE = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cuenta las reservas ACTIVAS en una clase para una fecha dada (INDIVIDUAL)
 * o en promedio para el mes vigente (MENSUAL).
 */
const contarReservasActivas = async (claseId, tipo, fechaExacta, transaction) => {
  const where = {
    clase_id: claseId,
    estado: { [Op.ne]: "CANCELADA" },
  };
  if (tipo === "INDIVIDUAL" && fechaExacta) {
    where.fecha_exacta = fechaExacta;
  }
  return ReservaClase.count({ where, transaction });
};

/**
 * Devuelve el siguiente cliente ESPERANDO en la cola para una clase/tipo/fecha.
 */
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

    // Verificar que realmente esté llena
    const reservasActivas = await contarReservasActivas(claseId, tipo, fechaExacta, transaction);
    if (reservasActivas < clase.cupo) {
      throw httpError(400, "La clase todavía tiene cupos disponibles. No es necesario anotarse en la lista de espera.");
    }

    // Verificar que el cliente no esté ya en la lista
    const whereExistente = { clase_id: claseId, cliente_email: clienteEmail, tipo, estado: "ESPERANDO" };
    if (tipo === "INDIVIDUAL" && fechaExacta) whereExistente.fecha_exacta = fechaExacta;
    const existente = await ListaEspera.findOne({ where: whereExistente, transaction });
    if (existente) {
      throw httpError(409, "Ya estás anotado/a en la lista de espera para esta clase");
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
 */
const notificarPrimero = async (claseId, tipo, fechaExacta = null) => {
  return conn.transaction(async (transaction) => {
    const entrada = await buscarPrimeroEnEspera(claseId, tipo, fechaExacta, transaction);
    if (!entrada) return null; // Cola vacía

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
        horasLimite: HORAS_LIMITE,
      });
    });

    return entrada;
  });
};

/**
 * Cron job: revisa registros NOTIFICADO cuyo tiempo de 6hs expiró,
 * los marca como EXPIRADO y llama al siguiente en la fila.
 */
const verificarExpirados = async () => {
  const limite = new Date(Date.now() - HORAS_LIMITE * 60 * 60 * 1000);

  const expirados = await ListaEspera.findAll({
    where: {
      estado: "NOTIFICADO",
      notificado_en: { [Op.lt]: limite },
    },
    include: [
      { model: Usuario, as: "cliente", attributes: ["email", "nombre"] },
      { model: Clase, as: "clase", attributes: ["nombre"] },
    ],
  });

  for (const entrada of expirados) {
    await entrada.update({ estado: "EXPIRADO" });

    // Notificar expiración al cliente (sin bloquear)
    setImmediate(() => {
      notificarExpiracion({
        email: entrada.cliente.email,
        nombre: entrada.cliente.nombre,
        nombreClase: entrada.clase.nombre,
      });
    });

    // Llamar al siguiente en la fila
    await notificarPrimero(entrada.clase_id, entrada.tipo, entrada.fecha_exacta);
  }

  if (expirados.length > 0) {
    console.log(`[listaEspera.cron] ${expirados.length} entradas expiradas procesadas.`);
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
  verificarExpirados,
  removerDeListaManual,
  getListaEspera,
};
