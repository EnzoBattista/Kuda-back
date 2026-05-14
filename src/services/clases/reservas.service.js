const { Op } = require("sequelize");
const { ReservaClase, InscripcionMensual, InscripcionIndividual, Vale } = require("../../../db");
const httpError = require("../../utils/httpError");

const HORAS_ANTICIPACION = 24;
const PORCENTAJE_VALE = 0.20; // 20% de la mensualidad

/**
 * Calcula cuántas horas faltan desde ahora hasta fecha_exacta.
 * @param {string} fechaExacta - "YYYY-MM-DD"
 * @returns {number} horas de anticipación
 */
const horasHastaClase = (fechaExacta) => {
  const ahora = new Date();
  const fechaClase = new Date(fechaExacta + "T00:00:00Z");
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
  const reserva = await ReservaClase.findByPk(reservaId);
  if (!reserva) throw httpError(404, "Reserva no encontrada");
  if (reserva.cliente_email !== emailUsuario) {
    throw httpError(403, "No tenés permiso para cancelar esta reserva");
  }
  if (reserva.estado === "CANCELADA") {
    throw httpError(409, "La reserva ya está cancelada");
  }

  const horas = horasHastaClase(reserva.fecha_exacta);
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
      mensaje = "Cancelación exitosa. Se acreditó un vale de descuento para el mes siguiente.";
    } else {
      mensaje = "Cancelación exitosa. Sin devolución por cancelar con menos de 24hs de anticipación.";
    }
  } else if (reserva.origen === "INDIVIDUAL") {
    const inscripcion = await InscripcionIndividual.findByPk(reserva.origen_id);

    if (inscripcion && inscripcion.modalidad === "SEÑA") {
      mensaje = "Cancelación exitosa. La seña fue retenida.";
    } else if (conAnticipacion) {
      // Marcar la inscripción individual como pendiente de reembolso
      if (inscripcion) {
        await inscripcion.update({ estado_seña: null }); // campo reutilizado como señal, o bien un campo propio en Fase 3
      }
      reembolso = true;
      mensaje = "Cancelación exitosa. El reembolso será procesado en los próximos días.";
    } else {
      mensaje = "Cancelación exitosa. Sin devolución por cancelar con menos de 24hs de anticipación.";
    }
  }

  return { reserva, vale, reembolso, mensaje };
};

module.exports = { cancelarReserva };
