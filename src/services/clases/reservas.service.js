const { Op } = require("sequelize");
const { ReservaClase, InscripcionMensual, InscripcionIndividual, Vale, Clase } = require("../../../db");
const httpError = require("../../utils/httpError");

const HORAS_ANTICIPACION = 24;
const PORCENTAJE_VALE = 0.20; // 20% de la mensualidad

/**
 * Calcula cuántas horas faltan desde ahora hasta fecha_exacta a la hora de inicio.
 * @param {string} fechaExacta - "YYYY-MM-DD"
 * @param {string} horaInicio - "HH:mm:ss"
 * @returns {number} horas de anticipación
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
const generarVale = async (clienteEmail, montoMensualidad) => {
  const hoy = new Date();
  const validoDesde = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1); // 1ro del mes siguiente
  const validoHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0); // último día del mes siguiente

  return Vale.create({
    cliente_email: clienteEmail,
    monto: Number((montoMensualidad * PORCENTAJE_VALE).toFixed(2)),
    valido_desde: validoDesde.toISOString().slice(0, 10),
    valido_hasta: validoHasta.toISOString().slice(0, 10),
  });
};

/**
 * Cancela una ReservaClase. Aplica la lógica de devolución/vale según:
 * - origen MENSUAL: si +24hs genera Vale; si <24hs sin beneficio.
 * - origen INDIVIDUAL COMPLETO: si +24hs marca REEMBOLSO_PENDIENTE; si <24hs sin beneficio.
 * - origen INDIVIDUAL SEÑA: seña siempre retenida.
 *
 * @param {number} reservaId
 * @param {string} emailUsuario - email del usuario autenticado (para verificar propiedad)
 * @returns {{ reserva, vale?, reembolso: boolean, mensaje: string }}
 */
const cancelarReserva = async (reservaId, emailUsuario) => {
  const reserva = await ReservaClase.findByPk(reservaId, {
    include: [{ model: Clase, as: "clase" }],
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

  // Cancelar la reserva
  reserva.estado = "CANCELADA";
  await reserva.save();

  let vale = null;
  let reembolso = false;
  let mensaje = "";

  if (reserva.origen === "MENSUAL") {
    if (conAnticipacion) {
      // Buscar la inscripción mensual para obtener el monto
      const inscripcion = await InscripcionMensual.findByPk(reserva.origen_id);
      if (inscripcion) {
        vale = await generarVale(emailUsuario, inscripcion.monto);
      }
      mensaje = "Cancelación exitosa con reembolso";
    } else {
      mensaje = "Cancelación exitosa sin reembolso";
    }
  } else if (reserva.origen === "INDIVIDUAL") {
    const inscripcion = await InscripcionIndividual.findByPk(reserva.origen_id);

    if (conAnticipacion) {
      if (inscripcion) {
        // En un futuro se podría cambiar el estado general de la inscripción a 'REEMBOLSADA'
        await inscripcion.update({ estado_seña: null });
      }
      reembolso = true;
      mensaje = "Cancelación exitosa con reembolso";
    } else {
      mensaje = "Cancelación exitosa sin reembolso";
    }
  }

  return { reserva, vale, reembolso, mensaje };
};

module.exports = { cancelarReserva };
