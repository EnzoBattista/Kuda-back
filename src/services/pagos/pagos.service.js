const { Op } = require("sequelize");
const { MercadoPagoConfig, Preference } = require("mercadopago");
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

const crearPreferenciaMercadoPago = async ({ tituloPlan, precio, cliente_email, external_reference }) => {
  validarMonto(precio);

  if (!process.env.MP_ACCESS_TOKEN) {
    throw httpError(500, "Falta configurar MP_ACCESS_TOKEN en variables de entorno");
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preferenceClient = new Preference(client);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";

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
      success: `${frontendUrl}/clases?pago=ok`,
      failure: `${frontendUrl}/clases?pago=fail`,
      pending: `${frontendUrl}/clases?pago=pending`,
    },
    auto_return: "approved",
    external_reference: external_reference || undefined,
    payer: cliente_email ? { email: cliente_email } : undefined,
  };

  const preference = await preferenceClient.create({ body: bodyData });

  return {
    id: preference.id,
    init_point: preference.init_point,
    sandbox_init_point: preference.sandbox_init_point,
  };
};

const generarPagoQr = async (data, clienteEmail) => {
  const monto = validarMonto(data.monto);
  const email = data.cliente_email || clienteEmail;

  const cliente = await Cliente.findByPk(email);
  if (!cliente) throw httpError(404, "Cliente no encontrado");

  const concepto = data.concepto?.trim() || "Pago CEF Actividades";
  const referencia = `CEF-${Date.now()}-${email.split("@")[0]}`;

  let qrData = `alias: cef.actividades.mp | monto: ${monto} ARS | ref: ${referencia}`;
  let mpPreferenceId = null;

  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const pref = await crearPreferenciaMercadoPago({
        tituloPlan: concepto,
        precio: monto,
        cliente_email: email,
        external_reference: referencia,
      });
      mpPreferenceId = pref.id;
      qrData = pref.init_point || pref.sandbox_init_point || qrData;
    } catch {
      // Fallback al alias si MP falla
    }
  }

  const pago = await Pago.create({
    cliente_email: email,
    origen: data.origen ?? "CLASE_SUELTA",
    origen_id: data.origen_id ?? null,
    reserva_id: data.reserva_id ?? null,
    inscripcion_mensual_id: data.inscripcion_mensual_id ?? null,
    concepto,
    monto,
    metodo: "QR",
    estado: "PENDIENTE",
    mp_payment_id: mpPreferenceId,
    qr_referencia: qrData,
  });

  return {
    pago_id: pago.id,
    qr_data: qrData,
    referencia,
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
  generarPagoQr,
  obtenerComprobante,
  GIMNASIO,
};
