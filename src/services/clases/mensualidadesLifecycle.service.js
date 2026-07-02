const { Op } = require("sequelize");
const sgMail = require("@sendgrid/mail");
const {
  InscripcionMensual,
  ReservaClase,
  Cliente,
  Usuario,
  Actividad,
  conn,
} = require("../../../db");
const { getFechaHoyLocal, sumarDias } = require("../../utils/fechas");
const {
  getDiasGraciaMensual,
  obtenerConfiguracion,
} = require("../sistema/configuracion.service");
const { normalizarCanales } = require("../notificaciones/notificaciones.service");

const ESTADOS_IMPAGO = ["PENDIENTE_PAGO", "EN_GRACIA"];

const ultimaClaseEfectiva = async (inscripcionId, transaction = null) => {
  const reserva = await ReservaClase.findOne({
    where: {
      inscripcion_mensual_id: inscripcionId,
      estado: { [Op.ne]: "CANCELADA" },
    },
    attributes: ["fecha_exacta"],
    order: [["fecha_exacta", "DESC"]],
    transaction,
  });
  return reserva ? String(reserva.fecha_exacta).slice(0, 10) : null;
};

const obtenerInscripcionAnterior = async (inscripcion, transaction = null) => {
  if (!inscripcion.inscripcion_anterior_id) return null;
  return InscripcionMensual.findByPk(inscripcion.inscripcion_anterior_id, { transaction });
};

const calcularFinGracia = (periodoFinAnterior, diasGracia) =>
  sumarDias(String(periodoFinAnterior).slice(0, 10), diasGracia);

const enriquecerInscripcionMensual = async (inscripcion, diasGracia = null) => {
  const hoy = getFechaHoyLocal();
  const plain = inscripcion.toJSON ? inscripcion.toJSON() : { ...inscripcion };
  // Priorizamos los días de gracia congelados en la propia inscripción; solo
  // caemos al valor global (o config actual) para filas viejas sin snapshot.
  const dias = plain.dias_gracia ?? diasGracia ?? (await getDiasGraciaMensual());

  const ultimaClase = await ultimaClaseEfectiva(plain.id);
  plain.ultima_clase_efectiva = ultimaClase;

  const anterior = await obtenerInscripcionAnterior(plain);
  const periodoFinGracia = anterior
    ? String(anterior.periodo_fin).slice(0, 10)
    : String(plain.periodo_fin).slice(0, 10);

  const finGracia = calcularFinGracia(periodoFinGracia, dias);
  const requierePago = ESTADOS_IMPAGO.includes(plain.estado);

  let mostrarPagarMes = false;
  if (requierePago && anterior) {
    const ultimaClaseAnterior = await ultimaClaseEfectiva(anterior.id);
    if (ultimaClaseAnterior) {
      mostrarPagarMes = hoy >= ultimaClaseAnterior;
    }
  }

  let diasGraciaRestantes = null;
  if (requierePago && plain.estado === "EN_GRACIA") {
    const diff = Math.ceil(
      (new Date(`${finGracia}T12:00:00`) - new Date(`${hoy}T12:00:00`)) / (1000 * 60 * 60 * 24),
    );
    diasGraciaRestantes = Math.max(0, diff);
  }

  plain.requiere_pago = requierePago;
  plain.mostrar_pagar_mes = mostrarPagarMes;
  plain.dias_gracia_restantes = diasGraciaRestantes;
  plain.fin_gracia = requierePago ? finGracia : null;

  return plain;
};

const enviarRecordatorioPago = async (inscripcion, cliente, diasGracia) => {
  if (!cliente?.notificaciones_activas) return false;

  const canales = normalizarCanales(cliente.canales_notificacion);
  if (!canales.email) return false;

  const actividad = inscripcion.actividad
    ?? (await Actividad.findByPk(inscripcion.actividad_id));
  const nombre = cliente.usuario
    ? `${cliente.usuario.nombre} ${cliente.usuario.apellido}`.trim()
    : inscripcion.cliente_email;

  const anterior = await obtenerInscripcionAnterior(inscripcion);
  const periodoFinGracia = anterior
    ? String(anterior.periodo_fin).slice(0, 10)
    : String(inscripcion.periodo_fin).slice(0, 10);

  const finGracia = calcularFinGracia(periodoFinGracia, diasGracia);
  const hoy = getFechaHoyLocal();

  const diff = Math.ceil(
    (new Date(`${finGracia}T12:00:00`) - new Date(`${hoy}T12:00:00`)) / (1000 * 60 * 60 * 24),
  );
  const diasRestantes = Math.max(0, diff);

  const asunto = "Recordatorio de pago — mensualidad CEF Actividades";
  const mensaje = `Hola! ${nombre}
Te recordamos que te quedan ${diasRestantes} días para abonar la reserva para el siguiente mes de ${actividad?.nombre ?? "actividad"}. De lo contrario, se cancelará la reserva a esa mensualidad automáticamente.
CEF Actividades`;

  if (process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to: inscripcion.cliente_email,
      from: process.env.EMAIL_FROM,
      subject: asunto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; white-space: pre-wrap;">
          <h2 style="color: #003366;">Recordatorio de pago</h2>
          <p>${mensaje}</p>
        </div>
      `,
    });
  } else {
    console.log("[mensualidades.recordatorio]", { to: inscripcion.cliente_email, mensaje });
  }

  return true;
};

const procesarCicloVidaMensualidades = async () => {
  const hoy = getFechaHoyLocal();
  const diasGracia = await getDiasGraciaMensual();
  const { recordatorio_pago_dia: recordatorioPagoDia } = await obtenerConfiguracion();
  let finalizadas = 0;
  let enGracia = 0;
  let suspendidas = 0;
  let recordatorios = 0;

  const vigentes = await InscripcionMensual.findAll({
    where: { estado: "VIGENTE" },
  });

  for (const ins of vigentes) {
    const ultima = await ultimaClaseEfectiva(ins.id);
    if (ultima && ultima < hoy) {
      await ins.update({ estado: "FINALIZADA" });
      finalizadas += 1;
    }
  }

  const pendientes = await InscripcionMensual.findAll({
    where: { estado: "PENDIENTE_PAGO" },
    include: [{ model: Actividad, as: "actividad" }],
  });

  for (const ins of pendientes) {
    const anterior = await obtenerInscripcionAnterior(ins);
    if (!anterior) continue;

    const inicioGracia = String(anterior.periodo_fin).slice(0, 10);
    if (hoy >= inicioGracia) {
      await ins.update({ estado: "EN_GRACIA" });
      enGracia += 1;
    }
  }

  const enGraciaList = await InscripcionMensual.findAll({
    where: { estado: "EN_GRACIA" },
    include: [{ model: Actividad, as: "actividad" }],
  });

  for (const ins of enGraciaList) {
    const anterior = await obtenerInscripcionAnterior(ins);
    const periodoFinGracia = anterior
      ? String(anterior.periodo_fin).slice(0, 10)
      : String(ins.periodo_fin).slice(0, 10);
    const finGracia = calcularFinGracia(periodoFinGracia, ins.dias_gracia ?? diasGracia);

    if (hoy > finGracia) {
      await conn.transaction(async (transaction) => {
        await ReservaClase.update(
          { estado: "CANCELADA" },
          {
            where: {
              inscripcion_mensual_id: ins.id,
              estado: { [Op.in]: ["ACTIVA", "PENDIENTE_PAGO"] },
            },
            transaction,
            validate: false,
          },
        );
        await ins.update({ estado: "SUSPENDIDA" }, { transaction });
      });
      suspendidas += 1;
    }
  }

  const impagas = await InscripcionMensual.findAll({
    where: { estado: { [Op.in]: ESTADOS_IMPAGO } },
    include: [
      { model: Actividad, as: "actividad" },
      {
        model: Cliente,
        as: "cliente",
        include: [{ model: Usuario, as: "usuario", attributes: ["nombre", "apellido", "email"] }],
      },
    ],
  });

  for (const ins of impagas) {
    const anterior = await obtenerInscripcionAnterior(ins);
    if (!anterior) continue;

    const inicioGracia = String(anterior.periodo_fin).slice(0, 10);
    if (recordatorioPagoDia == null) continue;

    const diaRecordatorio = sumarDias(inicioGracia, Number(recordatorioPagoDia) - 1);
    if (diaRecordatorio === hoy) {
      const enviado = await enviarRecordatorioPago(ins, ins.cliente, ins.dias_gracia ?? diasGracia);
      if (enviado) recordatorios += 1;
    }
  }

  return { finalizadas, enGracia, suspendidas, recordatorios };
};

module.exports = {
  ultimaClaseEfectiva,
  obtenerInscripcionAnterior,
  enriquecerInscripcionMensual,
  procesarCicloVidaMensualidades,
  enviarRecordatorioPago,
};
