const { Op } = require("sequelize");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const {
  Pago,
  Cliente,
  Usuario,
  ReservaClase,
  InscripcionMensual,
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
  if (estado === "RECHAZADO") return "Tu pago ha sido rechazado o cancelado.";
  if (mpStatus === "pending") return "Tu pago está pendiente de acreditación.";
  if (mpStatus === "in_process") return "Tu pago se está procesando.";
  return "Estamos esperando la confirmación de Mercado Pago.";
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

const registrarPagoManual = async (data, recepcionistaEmail) => {
  const monto = validarMonto(data.monto);
  const metodo = data.metodo;

  if (!["EFECTIVO", "TRANSFERENCIA"].includes(metodo)) {
    throw httpError(400, "El método de pago manual debe ser EFECTIVO o TRANSFERENCIA");
  }

  const cliente = await Cliente.findByPk(data.cliente_email);
  if (!cliente) throw httpError(404, "Cliente no encontrado");

  const origen = data.origen ?? "MANUAL";

  const pago = await Pago.create({
    cliente_email: data.cliente_email,
    recepcionista_email: recepcionistaEmail,
    origen,
    origen_id: data.origen_id ?? null,
    reserva_id: data.reserva_id ?? null,
    inscripcion_mensual_id: data.inscripcion_mensual_id ?? null,
    concepto: data.concepto?.trim() || "Cobro en mostrador",
    monto,
    fecha: data.fecha ? new Date(data.fecha) : new Date(),
    metodo,
    estado: "COMPLETADO",
  });

  return pago;
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
  if (!process.env.MP_ACCESS_TOKEN || pago.estado !== "PENDIENTE") {
    return { pago, mp_status: null };
  }

  const ref = pago.qr_referencia || `pago-${pago.id}`;
  let mpPayment = null;

  try {
    const paymentClient = new Payment(mpClient());
    const search = await paymentClient.search({
      options: {
        sort: "date_created",
        criteria: "desc",
        external_reference: ref,
      },
    });
    const results = search?.results ?? [];
    mpPayment =
      results.find((item) => item.status === "approved") ||
      results.find((item) => item.status === "pending" || item.status === "in_process") ||
      results[0] ||
      null;
  } catch (err) {
    console.warn("[pagos.mp] Error al consultar MP:", err.message);
    return { pago, mp_status: null };
  }

  if (!mpPayment) {
    return { pago, mp_status: null };
  }

  const nuevoEstado = mapMpStatus(mpPayment.status);
  if (nuevoEstado !== pago.estado || String(pago.mp_payment_id) !== String(mpPayment.id)) {
    await pago.update({
      estado: nuevoEstado,
      mp_payment_id: String(mpPayment.id),
    });
    await pago.reload();
  }

  return { pago, mp_status: mpPayment.status, mp_status_detail: mpPayment.status_detail };
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

  const external_reference = `pago-${pago.id}`;

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

    await pago.update({
      estado: mapMpStatus(mpPayment.status),
      mp_payment_id: String(mpPayment.id),
    });
  } catch (err) {
    console.warn("[pagos.webhook] Error:", err.message);
  }

  return { received: true };
};

const generarPagoQr = async (data, clienteEmail) => {
  const monto = validarMonto(data.monto);
  const email = data.cliente_email || clienteEmail;

  const cliente = await Cliente.findByPk(email);
  if (!cliente) throw httpError(404, "Cliente no encontrado");

  const concepto = data.concepto?.trim() || "Pago CEF Actividades";
  const external_reference = `CEF-${Date.now()}-${email.split("@")[0]}`;

  let qrData = `alias: cef.actividades.mp | monto: ${monto} ARS | ref: ${external_reference}`;
  let mpPreferenceId = null;

  const reservaId = await resolverReservaId(data.reserva_id);
  const inscripcionMensualId = await resolverInscripcionMensualId(data.inscripcion_mensual_id);

  const pago = await Pago.create({
    cliente_email: email,
    origen: data.origen ?? "CLASE_SUELTA",
    origen_id: data.origen_id ?? null,
    reserva_id: reservaId,
    inscripcion_mensual_id: inscripcionMensualId,
    concepto,
    monto,
    metodo: "QR",
    estado: "PENDIENTE",
    qr_referencia: external_reference,
  });

  const mpRef = `pago-${pago.id}`;

  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const pref = await crearPreferenciaMercadoPago({
        tituloPlan: concepto,
        precio: monto,
        cliente_email: email,
        external_reference: mpRef,
        pago_id: pago.id,
      });
      mpPreferenceId = pref.id;
      qrData = pref.init_point || pref.sandbox_init_point || qrData;
      await pago.update({
        mp_payment_id: String(pref.id),
        qr_referencia: mpRef,
      });
    } catch (err) {
      console.warn("[pagos.qr] MP no disponible, usando QR local:", err.message);
    }
  }

  return {
    pago_id: pago.id,
    qr_data: qrData,
    referencia: pago.qr_referencia || external_reference,
    estado: pago.estado,
    monto: Number(pago.monto),
    concepto: pago.concepto,
  };
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
  registrarPagoManual,
  crearPreferenciaMercadoPago,
  crearPagoMercadoPago,
  consultarEstadoPago,
  procesarWebhookMercadoPago,
  sincronizarPagoConMercadoPago,
  generarPagoQr,
  obtenerComprobante,
  mensajeEstadoPago,
  GIMNASIO,
};
