const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const {
  Asistencia,
  ReservaClase,
  Cliente,
  Usuario,
  Clase,
  Actividad,
  InscripcionMensual,
  CancelacionClase,
  conn,
} = require("../../../db");
const httpError = require("../../utils/httpError");

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

const QR_TIPO = "qr_acceso";
const QR_EXPIRES_IN = process.env.QR_EXPIRES_IN || "15m";
const MINUTOS_ANTES_CLASE = 30;

const AVATAR_DEFAULT = (email, nombre = "Cliente") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=1e40af&color=fff&size=256`;

const hoyLocalISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const horaLocalActual = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const normalizarHora = (hora) => String(hora ?? "").slice(0, 5);

const restarMinutos = (hora, minutos) => {
  const [h, m] = normalizarHora(hora).split(":").map(Number);
  const total = h * 60 + m - minutos;
  const nh = Math.floor((total + 1440) % 1440 / 60);
  const nm = (total + 1440) % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
};

const compararHoras = (a, b) => normalizarHora(a).localeCompare(normalizarHora(b));

const diaSemanaHoy = () => DIAS_SEMANA[new Date().getDay()];

const fotoPerfilCliente = (cliente, usuario) => {
  if (cliente?.foto_perfil) return cliente.foto_perfil;
  const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : cliente?.usuario_email;
  return AVATAR_DEFAULT(cliente?.usuario_email ?? "cliente", nombre);
};

const validarMoraCliente = async (clienteEmail) => {
  const mensualidad = await InscripcionMensual.findOne({
    where: {
      cliente_email: clienteEmail,
      estado: { [Op.in]: ["VIGENTE", "EN_GRACIA", "SUSPENDIDA"] },
    },
    order: [["periodo_fin", "DESC"]],
  });

  if (!mensualidad) return;

  if (mensualidad.estado === "SUSPENDIDA") {
    throw httpError(
      403,
      "Su mensualidad se encuentra suspendida por falta de pago.",
    );
  }

  if (mensualidad.estado === "EN_GRACIA") {
    const hoy = new Date();
    const fin = new Date(mensualidad.periodo_fin);
    const diasGracia = (hoy - fin) / (1000 * 60 * 60 * 24);
    if (diasGracia > 10) {
      throw httpError(
        403,
        "Su mensualidad se encuentra suspendida por falta de pago.",
      );
    }
  }
};

const claseEnVentana = (clase, horaActual) => {
  const inicioVentana = restarMinutos(clase.hora_inicio, MINUTOS_ANTES_CLASE);
  const fin = normalizarHora(clase.hora_fin);
  return compararHoras(horaActual, inicioVentana) >= 0 && compararHoras(horaActual, fin) <= 0;
};

const claseProximaHoy = (clase, horaActual) =>
  compararHoras(clase.hora_inicio, horaActual) >= 0;

const ordenarPorHorario = (a, b) =>
  compararHoras(a.hora_inicio, b.hora_inicio);

const buscarReservaTurnoActual = async (clienteEmail) => {
  const hoy = hoyLocalISO();
  const horaActual = horaLocalActual();

  const reservas = await ReservaClase.findAll({
    where: {
      cliente_email: clienteEmail,
      fecha_exacta: hoy,
      estado: "ACTIVA",
    },
    include: [
      {
        model: Clase,
        as: "clase",
        where: { activa: true, dia_semana: diaSemanaHoy() },
        include: [{ model: Actividad, as: "actividad", attributes: ["id", "nombre"] }],
      },
    ],
    order: [["id", "ASC"]],
  });

  if (reservas.length === 0) return null;

  const enCurso = reservas
    .filter((r) => r.clase && claseEnVentana(r.clase, horaActual))
    .sort((a, b) => ordenarPorHorario(a.clase, b.clase));

  if (enCurso.length > 0) return enCurso[0];

  const proximas = reservas
    .filter((r) => r.clase && claseProximaHoy(r.clase, horaActual))
    .sort((a, b) => ordenarPorHorario(a.clase, b.clase));

  return proximas[0] ?? reservas[0];
};

const generarTokenQr = (email, reservaId) =>
  jwt.sign(
    { type: QR_TIPO, email, reserva_id: reservaId },
    process.env.JWT_SECRET,
    { expiresIn: QR_EXPIRES_IN },
  );

const verificarTokenQr = (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== QR_TIPO || !payload.email || !payload.reserva_id) {
      throw httpError(400, "QR no es valido");
    }
    return payload;
  } catch (err) {
    if (err.status) throw err;
    throw httpError(400, "QR no es valido");
  }
};

const generarQrCliente = async (clienteEmail) => {
  const cliente = await Cliente.findByPk(clienteEmail, {
    include: [{ model: Usuario, as: "usuario", attributes: ["nombre", "apellido", "dni", "email"] }],
  });

  if (!cliente) throw httpError(404, "Cliente no encontrado");

  if (!cliente.fichaMedica) {
    throw httpError(
      400,
      "Debe cargar su ficha médica en el perfil para generar el código QR.",
    );
  }

  await validarMoraCliente(clienteEmail);

  const reserva = await buscarReservaTurnoActual(clienteEmail);
  if (!reserva) {
    throw httpError(
      400,
      "No tenés una clase reservada para hoy. El QR de acceso se habilita el día de tu clase, desde 30 minutos antes del horario.",
    );
  }

  const token = generarTokenQr(clienteEmail, reserva.id);

  return {
    token,
    expira_en: QR_EXPIRES_IN,
    reserva_id: reserva.id,
    clase: {
      id: reserva.clase.id,
      nombre: reserva.clase.nombre,
      actividad: reserva.clase.actividad?.nombre,
      dia_semana: reserva.clase.dia_semana,
      hora_inicio: normalizarHora(reserva.clase.hora_inicio),
      hora_fin: normalizarHora(reserva.clase.hora_fin),
      fecha: reserva.fecha_exacta,
    },
  };
};

const escanearQr = async (token) => {
  const payload = verificarTokenQr(token);

  const reserva = await ReservaClase.findByPk(payload.reserva_id, {
    include: [
      {
        model: Cliente,
        as: "cliente",
        include: [{ model: Usuario, as: "usuario" }],
      },
      { model: Clase, as: "clase", include: [{ model: Actividad, as: "actividad" }] },
    ],
  });

  if (
    !reserva ||
    reserva.cliente_email !== payload.email ||
    reserva.estado !== "ACTIVA" ||
    reserva.fecha_exacta !== hoyLocalISO()
  ) {
    throw httpError(400, "QR no es valido");
  }

  const usuario = reserva.cliente?.usuario;

  return {
    reserva_id: reserva.id,
    cliente: {
      email: reserva.cliente_email,
      nombre: usuario?.nombre,
      apellido: usuario?.apellido,
      dni: usuario?.dni,
      foto_perfil: fotoPerfilCliente(reserva.cliente, usuario),
    },
    clase: {
      id: reserva.clase.id,
      nombre: reserva.clase.nombre,
      actividad: reserva.clase.actividad?.nombre,
      dia_semana: reserva.clase.dia_semana,
      hora_inicio: normalizarHora(reserva.clase.hora_inicio),
      hora_fin: normalizarHora(reserva.clase.hora_fin),
      fecha: reserva.fecha_exacta,
    },
  };
};

const registrarAsistencia = async (data, staffEmail) => {
  const { reserva_id, email, clase_id, estado, motivo_denegado } = data;

  if (!["PRESENTE", "DENEGADO", "AUSENTE"].includes(estado)) {
    throw httpError(400, "Estado de asistencia inválido");
  }

  if (estado === "DENEGADO" && !motivo_denegado?.trim()) {
    throw httpError(400, "Debe indicar un motivo para denegar el acceso");
  }

  const reserva = await ReservaClase.findByPk(reserva_id, {
    include: [{ model: Clase, as: "clase" }],
  });

  if (
    !reserva ||
    reserva.cliente_email !== email ||
    reserva.clase_id !== Number(clase_id) ||
    reserva.estado !== "ACTIVA"
  ) {
    throw httpError(404, "Reserva no encontrada o no coincide con los datos enviados");
  }

  if (estado === "PRESENTE" || estado === "AUSENTE") {
    const cliente = await Cliente.findByPk(email);
    if (!cliente?.fichaMedica) {
      throw httpError(400, "El cliente debe tener su ficha médica cargada obligatoriamente");
    }

    if (estado === "PRESENTE") {
      try {
        await validarMoraCliente(email);
      } catch (err) {
        if (err.status === 403) {
          throw httpError(403, "El cliente no se encuentra al dia con el pago");
        }
        throw err;
      }
    }
  }

  const asistenciaExistente = await Asistencia.findOne({
    where: { reserva_id: reserva.id, estado: "PRESENTE" },
  });

  if (asistenciaExistente && estado === "PRESENTE") {
    throw httpError(409, "La asistencia ya fue registrada para esta reserva");
  }

  return conn.transaction(async (transaction) => {
    const asistencia = await Asistencia.create(
      {
        reserva_id: reserva.id,
        cliente_email: email,
        clase_id: reserva.clase_id,
        fecha: reserva.fecha_exacta,
        estado,
        motivo_denegado: estado === "DENEGADO" ? motivo_denegado.trim() : null,
        registrado_por_email: staffEmail ?? null,
      },
      { transaction },
    );

    if (estado === "PRESENTE") {
      await reserva.update({ asistio: true }, { transaction });
    } else if (estado === "AUSENTE") {
      await reserva.update({ asistio: false }, { transaction });
    }

    const mensajes = {
      PRESENTE: "Reserva confirmada con éxito",
      DENEGADO: "Se canceló la operación. El acceso fue denegado.",
      AUSENTE: "Asistencia registrada como ausente.",
    };

    return {
      message: mensajes[estado],
      asistencia,
    };
  });
};

const listarHistorial = async ({ usuarioEmail, rolNombre, esStaff }) => {
  const where = {};

  if (!esStaff) {
    where.cliente_email = usuarioEmail;
  }

  const registros = await Asistencia.findAll({
    where,
    include: [
      {
        model: Cliente,
        as: "cliente",
        include: [{ model: Usuario, as: "usuario", attributes: ["nombre", "apellido", "dni", "email"] }],
      },
      {
        model: Clase,
        as: "clase",
        include: [{ model: Actividad, as: "actividad", attributes: ["nombre"] }],
      },
    ],
    order: [["fecha", "DESC"], ["createdAt", "DESC"]],
  });

  return registros.map((a) => ({
    id: a.id,
    fecha: a.fecha,
    estado: a.estado,
    motivo_denegado: a.motivo_denegado,
    cliente: a.cliente?.usuario
      ? {
          email: a.cliente_email,
          nombre: a.cliente.usuario.nombre,
          apellido: a.cliente.usuario.apellido,
          dni: a.cliente.usuario.dni,
        }
      : { email: a.cliente_email },
    clase: a.clase
      ? {
          id: a.clase.id,
          nombre: a.clase.nombre,
          actividad: a.clase.actividad?.nombre,
          dia_semana: a.clase.dia_semana,
          hora_inicio: normalizarHora(a.clase.hora_inicio),
          hora_fin: normalizarHora(a.clase.hora_fin),
        }
      : null,
    registrado_en: a.createdAt,
  }));
};

const listarClasesHoy = async () => {
  const hoy = hoyLocalISO();
  const dia = diaSemanaHoy();

  const cancelaciones = await CancelacionClase.findAll({
    where: { fecha: hoy },
    attributes: ["clase_id"],
  });
  const clasesCanceladas = new Set(cancelaciones.map((c) => c.clase_id));

  const clases = await Clase.findAll({
    where: { activa: true, dia_semana: dia },
    include: [{ model: Actividad, as: "actividad", attributes: ["nombre"] }],
    order: [["hora_inicio", "ASC"]],
  });

  const clasesActivasHoy = clases.filter((c) => !clasesCanceladas.has(c.id));

  const resultado = [];

  for (const clase of clasesActivasHoy) {
    const reservas = await ReservaClase.findAll({
      where: { clase_id: clase.id, fecha_exacta: hoy, estado: "ACTIVA" },
      include: [
        {
          model: Cliente,
          as: "cliente",
          include: [{ model: Usuario, as: "usuario", attributes: ["nombre", "apellido", "dni", "email"] }],
        },
      ],
      order: [["id", "ASC"]],
    });

    const asistencias = await Asistencia.findAll({
      where: { clase_id: clase.id, fecha: hoy },
    });
    const asistenciaPorReserva = Object.fromEntries(
      asistencias.map((a) => [a.reserva_id, a]),
    );

    resultado.push({
      id: clase.id,
      nombre: clase.nombre,
      actividad: clase.actividad?.nombre,
      hora_inicio: normalizarHora(clase.hora_inicio),
      hora_fin: normalizarHora(clase.hora_fin),
      inscriptos: reservas.map((r) => ({
        reserva_id: r.id,
        email: r.cliente_email,
        nombre: r.cliente?.usuario?.nombre,
        apellido: r.cliente?.usuario?.apellido,
        dni: r.cliente?.usuario?.dni,
        asistio: r.asistio,
        asistencia: asistenciaPorReserva[r.id]
          ? {
              id: asistenciaPorReserva[r.id].id,
              estado: asistenciaPorReserva[r.id].estado,
            }
          : null,
      })),
    });
  }

  return { fecha: hoy, clases: resultado };
};

module.exports = {
  generarQrCliente,
  escanearQr,
  registrarAsistencia,
  listarHistorial,
  listarClasesHoy,
  fotoPerfilCliente,
};
