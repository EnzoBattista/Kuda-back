const { Op } = require("sequelize");
const { randomUUID } = require("crypto");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const {
  Pago,
  Cliente,
  Usuario,
  ReservaClase,
  InscripcionMensual,
  Vale,
  conn,
} = require("../../../db");
const httpError = require("../../utils/httpError");

const GIMNASIO = {
  nombre: "CEF Actividades",
  subtitulo: "Centro de bienestar",
  direccion: "Av. Corrientes 1234, CABA",
  cuit: "30-71234567-8",
  email: "kudasolucionesit@gmail.com",
  logo_url: "/LogoSolo.png",
};

const includesListado = [
  {
    model: Cliente,
    as: "cliente",
    include: [{ model: Usuario, as: "usuario", attributes: ["nombre", "apellido", "dni", "email"] }],
  },
  { model: Usuario, as: "recepcionista", attributes: ["nombre", "apellido", "email"] },
];

const includesDetalle = [
  ...includesListado,
  { model: ReservaClase, as: "reserva" },
  { model: InscripcionMensual, as: "inscripcionMensual" },
];

const validarMonto = (monto) => {
  const n = Number(monto);
  if (!Number.isFinite(n) || n <= 0) {
    throw httpError(400, "El monto del pago debe ser mayor a cero");
  }
  return n;
};

const esUrlPublicaHttps = (url) => typeof url === "string" && url.startsWith("https://");

const mpClient = () => {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw httpError(500, "Falta configurar MP_ACCESS_TOKEN en variables de entorno");
  }
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
};

const mapMpStatus = (status) => {
  if (status === "approved") return "COMPLETADO";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) return "RECHAZADO";
  return "PENDIENTE";
};

const mensajeEstadoPago = (estado, mpStatus) => {
  if (estado === "COMPLETADO") return "Tu pago fue registrado exitosamente.";
  if (estado === "RECHAZADO") {
    return "Tu pago fue rechazado. La reserva no fue confirmada. Podés intentarlo de nuevo con otro medio de pago.";
  }
  if (mpStatus === "pending") return "Tu pago está pendiente de acreditación.";
  if (mpStatus === "in_process") return "Tu pago se está procesando.";
  return "Estamos esperando la confirmación de Mercado Pago.";
};

const referenciaPago = (pago) => pago.qr_referencia || `pago-${pago.id}`;

/** Evita falsos positivos: MP sandbox reutiliza external_reference entre resets de BD. */
const esPagoMpVinculado = (mpPayment, pago) => {
  if (!mpPayment || !pago) return false;
  if (String(mpPayment.external_reference || "") !== referenciaPago(pago)) return false;
  const inicioPago = new Date(pago.createdAt).getTime() - 60_000;
  if (new Date(mpPayment.date_created).getTime() < inicioPago) return false;
  if (
    ["rejected", "cancelled", "refunded", "charged_back"].includes(mpPayment.status)
  ) {
    return true;
  }
  const montoMp = Number(mpPayment.transaction_amount);
  const montoLocal = Number(pago.monto);
  if (!Number.isFinite(montoMp) || Math.abs(montoMp - montoLocal) > 0.02) return false;
  return true;
};

const buscarPagosMpPorReferencia = async (pago) => {
  const ref = referenciaPago(pago);
  const paymentClient = new Payment(mpClient());
  const search = await paymentClient.search({
    options: {
      sort: "date_created",
      criteria: "desc",
      external_reference: ref,
    },
  });
  return (search?.results ?? []).filter(
    (item) => String(item.external_reference || "") === ref,
  );
};

/** Evita FK inválido si el front envía un id de inscripción en lugar de reserva. */
const resolverReservaId = async (reservaId) => {
  if (!reservaId) return null;
  const reserva = await ReservaClase.findByPk(reservaId);
  return reserva ? reservaId : null;
};

const resolverInscripcionMensualId = async (inscripcionMensualId) => {
  if (!inscripcionMensualId) return null;
  const inscripcion = await InscripcionMensual.findByPk(inscripcionMensualId);
  return inscripcion ? inscripcionMensualId : null;
};

/**
 * Activa inscripción/reserva que quedaron en PENDIENTE_PAGO hasta cobrar.
 */
const confirmarInscripcionPorPagoExitoso = async (pago) => {
  if (!pago || pago.estado !== "COMPLETADO") return;
  if (pago.origen === "SALDO_SEÑA") return;

  await conn.transaction(async (transaction) => {
    if (pago.inscripcion_mensual_id) {
      const ins = await InscripcionMensual.findByPk(pago.inscripcion_mensual_id, { transaction });
      if (ins?.estado === "PENDIENTE_PAGO") {
        await ins.update({ estado: "VIGENTE" }, { transaction });
      }
      if (ins) {
        await ReservaClase.update(
          { estado: "ACTIVA" },
          {
            where: {
              inscripcion_mensual_id: ins.id,
              estado: "PENDIENTE_PAGO",
            },
            transaction,
            validate: false,
          },
        );
      }
    }

    const inscripcionIndividualId =
      pago.origen_id && ["CLASE_SUELTA", "SEÑA", "SALDO_SEÑA"].includes(pago.origen)
        ? pago.origen_id
        : null;

    if (inscripcionIndividualId && ["CLASE_SUELTA", "SEÑA"].includes(pago.origen)) {
      await ReservaClase.update(
        { estado: "ACTIVA" },
        {
          where: {
            inscripcion_individual_id: inscripcionIndividualId,
            estado: "PENDIENTE_PAGO",
          },
          transaction,
          validate: false,
        },
      );
    }

    if (pago.reserva_id) {
      const reserva = await ReservaClase.findByPk(pago.reserva_id, { transaction });
      if (reserva?.estado === "PENDIENTE_PAGO") {
        await reserva.update({ estado: "ACTIVA" }, { transaction, validate: false });
      }
    }
  });
};

/**
 * Cancela inscripción/reserva creadas antes de cobrar cuando el pago no se completa.
 * No genera vales ni reembolsos (nunca hubo cobro efectivo).
 */
const revertirInscripcionPorPagoFallido = async (pago) => {
  if (!pago || pago.estado === "COMPLETADO") return;
  // Completar saldo de seña: la reserva parcial ya es válida; solo falló el cobro del resto.
  if (pago.origen === "SALDO_SEÑA") return;

  const estadosReservaActivos = ["ACTIVA", "PENDIENTE_PAGO"];

  await conn.transaction(async (transaction) => {
    if (pago.inscripcion_mensual_id) {
      const ins = await InscripcionMensual.findByPk(pago.inscripcion_mensual_id, { transaction });
      if (ins && !["CANCELADA", "FINALIZADA"].includes(ins.estado)) {
        await ReservaClase.update(
          { estado: "CANCELADA" },
          {
            where: {
              inscripcion_mensual_id: ins.id,
              estado: { [Op.in]: estadosReservaActivos },
            },
            transaction,
            validate: false,
          },
        );
        await ins.update({ estado: "CANCELADA" }, { transaction });
        await Vale.update(
          { usado_en_pago_id: null },
          { where: { usado_en_pago_id: ins.id }, transaction },
        );
      }
    }

    const inscripcionIndividualId =
      pago.origen_id && ["CLASE_SUELTA", "SEÑA", "SALDO_SEÑA"].includes(pago.origen)
        ? pago.origen_id
        : null;

    if (inscripcionIndividualId) {
      await ReservaClase.update(
        { estado: "CANCELADA" },
        {
          where: {
            inscripcion_individual_id: inscripcionIndividualId,
            estado: { [Op.in]: estadosReservaActivos },
          },
          transaction,
          validate: false,
        },
      );
      await Vale.update(
        { usado_en_pago_id: null },
        { where: { usado_en_pago_id: inscripcionIndividualId }, transaction },
      );
    }

    if (pago.reserva_id) {
      const reserva = await ReservaClase.findByPk(pago.reserva_id, { transaction });
      if (reserva && estadosReservaActivos.includes(reserva.estado)) {
        await reserva.update({ estado: "CANCELADA" }, { transaction, validate: false });
      }
    }
  });
};

const listarPagos = async (filtros = {}) => {
  const { cliente_email, metodo, estado, desde, hasta } = filtros;
  const where = {};

  if (cliente_email) where.cliente_email = cliente_email;
  if (metodo) where.metodo = metodo;
  if (estado) where.estado = estado;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = new Date(`${desde}T00:00:00`);
    if (hasta) where.fecha[Op.lte] = new Date(`${hasta}T23:59:59`);
  }

  return Pago.findAll({
    where,
    include: includesListado,
    order: [["fecha", "DESC"]],
  });
};

const crearPreferenciaMercadoPago = async ({
  tituloPlan,
  precio,
  cliente_email,
  external_reference,
  pago_id,
}) => {
  validarMonto(precio);

  const client = mpClient();
  const preferenceClient = new Preference(client);

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:4200").replace(/\/$/, "");
  const successUrl = pago_id
    ? `${frontendUrl}/clases?pago=ok&pago_id=${pago_id}`
    : `${frontendUrl}/clases?pago=ok`;

  const bodyData = {
    items: [
      {
        title: tituloPlan,
        quantity: 1,
        currency_id: "ARS",
        unit_price: Number(precio),
      },
    ],
    back_urls: {
      success: successUrl,
      failure: `${frontendUrl}/clases?pago=fail${pago_id ? `&pago_id=${pago_id}` : ""}`,
      pending: `${frontendUrl}/clases?pago=pending${pago_id ? `&pago_id=${pago_id}` : ""}`,
    },
    external_reference: external_reference || undefined,
    payer: cliente_email ? { email: cliente_email } : undefined,
  };

  if (process.env.MP_WEBHOOK_URL) {
    bodyData.notification_url = process.env.MP_WEBHOOK_URL;
  }

  if (esUrlPublicaHttps(successUrl)) {
    bodyData.auto_return = "approved";
  }

  try {
    const preference = await preferenceClient.create({ body: bodyData });

    return {
      id: preference.id,
      init_point: preference.init_point || preference.sandbox_init_point,
      sandbox_init_point: preference.sandbox_init_point,
    };
  } catch (err) {
    throw httpError(
      502,
      err?.message || "No se pudo crear la preferencia de Mercado Pago",
    );
  }
};

const sincronizarPagoConMercadoPago = async (pago) => {
  if (!process.env.MP_ACCESS_TOKEN) {
    return { pago, mp_status: null, mp_status_detail: null };
  }

  try {
    const results = await buscarPagosMpPorReferencia(pago);
    const vinculados = results
      .filter((item) => esPagoMpVinculado(item, pago))
      .sort(
        (a, b) =>
          new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
      );
    const aprobado = vinculados.find((item) => item.status === "approved");
    const mpPayment = aprobado || vinculados[0] || null;

    if (!mpPayment) {
      if (pago.estado === "COMPLETADO") {
        await revertirInscripcionPorPagoFallido({
          ...pago.get({ plain: true }),
          estado: "RECHAZADO",
        });
        await pago.update({ estado: "PENDIENTE" });
        await pago.reload();
      }
      return { pago, mp_status: null, mp_status_detail: null };
    }

    const nuevoEstado =
      mpPayment.status === "approved" ? "COMPLETADO" : mapMpStatus(mpPayment.status);
    const estadoAnterior = pago.estado;

    if (nuevoEstado !== pago.estado || String(pago.mp_payment_id) !== String(mpPayment.id)) {
      await pago.update({
        estado: nuevoEstado,
        mp_payment_id: String(mpPayment.id),
      });
      await pago.reload();
      if (nuevoEstado === "COMPLETADO" && estadoAnterior !== "COMPLETADO") {
        await confirmarInscripcionPorPagoExitoso(pago);
      }
      if (nuevoEstado === "RECHAZADO" && estadoAnterior !== "COMPLETADO") {
        await revertirInscripcionPorPagoFallido(pago);
      }
    }

    return {
      pago,
      mp_status: mpPayment.status,
      mp_status_detail: mpPayment.status_detail,
    };
  } catch (err) {
    console.warn("[pagos.mp] Error al consultar MP:", err.message);
    return { pago, mp_status: null, mp_status_detail: null };
  }
};

const crearPagoMercadoPago = async (data, clienteEmail) => {
  const monto = validarMonto(data.precio ?? data.monto);
  const email = data.cliente_email || clienteEmail;

  const cliente = await Cliente.findByPk(email);
  if (!cliente) throw httpError(404, "Cliente no encontrado");

  const reservaId = await resolverReservaId(data.reserva_id);
  const inscripcionMensualId = await resolverInscripcionMensualId(data.inscripcion_mensual_id);
  const titulo = data.tituloPlan?.trim() || data.concepto?.trim() || "Pago CEF Actividades";

  const pago = await Pago.create({
    cliente_email: email,
    origen: data.origen ?? "CLASE_SUELTA",
    origen_id: data.origen_id ?? null,
    reserva_id: reservaId,
    inscripcion_mensual_id: inscripcionMensualId,
    concepto: titulo,
    monto,
    metodo: "MERCADO_PAGO",
    estado: "PENDIENTE",
  });

  const external_reference = `pago-${pago.id}-${randomUUID()}`;

  const pref = await crearPreferenciaMercadoPago({
    tituloPlan: titulo,
    precio: monto,
    cliente_email: email,
    external_reference,
    pago_id: pago.id,
  });

  await pago.update({
    mp_payment_id: String(pref.id),
    qr_referencia: external_reference,
  });

  return {
    pago_id: pago.id,
    estado: pago.estado,
    external_reference,
    ...pref,
  };
};

const consultarEstadoPago = async (pagoId, clienteEmail) => {
  const pago = await Pago.findByPk(pagoId);
  if (!pago) throw httpError(404, "Pago no encontrado");
  if (pago.cliente_email !== clienteEmail) {
    throw httpError(403, "No tenés permiso para consultar este pago");
  }

  const { pago: actualizado, mp_status, mp_status_detail } =
    await sincronizarPagoConMercadoPago(pago);

  if (actualizado.estado === "COMPLETADO" && mp_status === "approved") {
    await confirmarInscripcionPorPagoExitoso(actualizado);
  }

  return {
    id: actualizado.id,
    estado: actualizado.estado,
    metodo: actualizado.metodo,
    monto: Number(actualizado.monto),
    concepto: actualizado.concepto,
    mp_status,
    mp_status_detail,
    message: mensajeEstadoPago(actualizado.estado, mp_status),
  };
};

/** El cliente abandona un checkout MP pendiente: se rechaza el pago y se libera la reserva. */
const abandonarPago = async (pagoId, clienteEmail) => {
  let pago = await Pago.findByPk(pagoId);
  if (!pago) throw httpError(404, "Pago no encontrado");
  if (pago.cliente_email !== clienteEmail) {
    throw httpError(403, "No tenés permiso para cancelar este pago");
  }
  if (pago.estado === "COMPLETADO") {
    await confirmarInscripcionPorPagoExitoso(pago);
    return {
      id: pago.id,
      estado: pago.estado,
      message: "Tu pago fue registrado exitosamente.",
    };
  }

  if (pago.estado === "PENDIENTE") {
    const { pago: sincronizado, mp_status } = await sincronizarPagoConMercadoPago(pago);
    pago = sincronizado;
    await pago.reload();

    if (pago.estado === "COMPLETADO" && mp_status === "approved") {
      await confirmarInscripcionPorPagoExitoso(pago);
      return {
        id: pago.id,
        estado: pago.estado,
        message: "Tu pago fue registrado exitosamente.",
      };
    }
  }

  if (pago.estado === "PENDIENTE") {
    await pago.update({ estado: "RECHAZADO" });
    await revertirInscripcionPorPagoFallido(pago);
  }

  return {
    id: pago.id,
    estado: pago.estado,
    message: "El pago no se completó. La reserva fue liberada.",
  };
};

/** Libera cupo cuando falló el checkout antes de crear el pago en MP. */
const liberarReservaPendiente = async (data, clienteEmail) => {
  const pagoSimulado = {
    estado: "RECHAZADO",
    origen: data.inscripcion_mensual_id ? "MENSUALIDAD" : "CLASE_SUELTA",
    origen_id: data.inscripcion_individual_id ?? null,
    inscripcion_mensual_id: data.inscripcion_mensual_id ?? null,
    reserva_id: data.reserva_id ?? null,
    cliente_email: clienteEmail,
  };

  if (pagoSimulado.inscripcion_mensual_id) {
    const ins = await InscripcionMensual.findByPk(pagoSimulado.inscripcion_mensual_id);
    if (ins && ins.cliente_email !== clienteEmail) {
      throw httpError(403, "No tenés permiso para liberar esta reserva");
    }
  }

  if (pagoSimulado.origen_id) {
    const reservas = await ReservaClase.findAll({
      where: { inscripcion_individual_id: pagoSimulado.origen_id, estado: "ACTIVA" },
      limit: 1,
    });
    if (reservas[0] && reservas[0].cliente_email !== clienteEmail) {
      throw httpError(403, "No tenés permiso para liberar esta reserva");
    }
  }

  await revertirInscripcionPorPagoFallido(pagoSimulado);
  return { message: "Reserva liberada por pago no completado" };
};

const procesarWebhookMercadoPago = async (req) => {
  const paymentId =
    req.body?.data?.id ||
    req.query["data.id"] ||
    (req.query.topic === "payment" ? req.query.id : null);

  if (!paymentId || !process.env.MP_ACCESS_TOKEN) {
    return { received: true };
  }

  try {
    const paymentClient = new Payment(mpClient());
    const mpPayment = await paymentClient.get({ id: String(paymentId) });
    const ref = mpPayment?.external_reference;
    if (!ref) return { received: true };

    const pago = await Pago.findOne({ where: { qr_referencia: ref } });
    if (!pago) return { received: true };
    if (!esPagoMpVinculado(mpPayment, pago)) return { received: true };

    const estadoAnterior = pago.estado;
    const nuevoEstado =
      mpPayment.status === "approved" ? "COMPLETADO" : mapMpStatus(mpPayment.status);
    await pago.update({
      estado: nuevoEstado,
      mp_payment_id: String(mpPayment.id),
    });
    if (nuevoEstado === "COMPLETADO" && estadoAnterior !== "COMPLETADO") {
      await confirmarInscripcionPorPagoExitoso(pago);
    }
    if (nuevoEstado === "RECHAZADO" && estadoAnterior !== "COMPLETADO") {
      await revertirInscripcionPorPagoFallido(pago);
    }
  } catch (err) {
    console.warn("[pagos.webhook] Error:", err.message);
  }

  return { received: true };
};

const obtenerComprobante = async (id) => {
  const pago = await Pago.findByPk(id, { include: includesDetalle });

  if (!pago) {
    throw httpError(404, "Pago no encontrado");
  }

  const usuario = pago.cliente?.usuario;

  return {
    gimnasio: GIMNASIO,
    pago: {
      id: pago.id,
      monto: Number(pago.monto),
      fecha: pago.fecha,
      metodo: pago.metodo,
      estado: pago.estado,
      concepto: pago.concepto,
      origen: pago.origen,
      referencia: pago.qr_referencia || pago.mp_payment_id || `PAGO-${pago.id}`,
    },
    cliente: usuario
      ? {
          email: pago.cliente_email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          dni: usuario.dni,
        }
      : { email: pago.cliente_email },
    recepcionista: pago.recepcionista
      ? {
          nombre: pago.recepcionista.nombre,
          apellido: pago.recepcionista.apellido,
          email: pago.recepcionista.email,
        }
      : null,
  };
};

module.exports = {
  listarPagos,
  crearPreferenciaMercadoPago,
  crearPagoMercadoPago,
  consultarEstadoPago,
  abandonarPago,
  liberarReservaPendiente,
  procesarWebhookMercadoPago,
  sincronizarPagoConMercadoPago,
  revertirInscripcionPorPagoFallido,
  obtenerComprobante,
  mensajeEstadoPago,
  GIMNASIO,
};
