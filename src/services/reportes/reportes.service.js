const { Op, fn, col } = require("sequelize");
const {
  Usuario,
  Rol,
  Pago,
  ReservaClase,
  Clase,
  Actividad,
  InscripcionMensual,
} = require("../../../db");
const httpError = require("../../utils/httpError");

const MESES_HISTORICO = 6;
const TOP_HORARIOS = 10;

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const mesActualIso = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

const haceMeses = (cantidad) => {
  const d = new Date();
  d.setMonth(d.getMonth() - cantidad);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const generarUltimosMeses = (cantidad = MESES_HISTORICO) => {
  const meses = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = cantidad - 1; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    meses.push(`${yyyy}-${mm}`);
  }
  return meses;
};

const mapMesCantidad = (filas, campoMes = "mes", campoCantidad = "cantidad") => {
  const mapa = new Map();
  for (const fila of filas) {
    const mes = fila[campoMes] ?? fila.get?.(campoMes);
    const cantidad = Number(fila[campoCantidad] ?? fila.get?.(campoCantidad) ?? 0);
    if (mes) mapa.set(String(mes), cantidad);
  }
  return mapa;
};

const completarMeses = (meses, mapa) =>
  meses.map((mes) => ({
    mes,
    cantidad: mapa.get(mes) ?? 0,
  }));

const toNumber = (value) => Number.parseFloat(value ?? 0) || 0;

const getTotalUsuarios = async () => {
  // Solo cuentan los usuarios ACTIVO (activo:true). Quedan fuera los ELIMINADO
  // (baja del admin) y los PENDIENTE (registro sin confirmar).
  const soloActivos = { activo: true };

  const total = await Usuario.count({ where: soloActivos });

  const porRol = await Usuario.findAll({
    attributes: [
      [col("rol.nombre"), "rol"],
      [fn("COUNT", col("Usuario.email")), "cantidad"],
    ],
    where: soloActivos,
    include: [{ model: Rol, as: "rol", attributes: [] }],
    group: [col("rol.nombre")],
    raw: true,
  });

  return {
    total,
    por_rol: porRol.map((r) => ({
      rol: r.rol,
      cantidad: Number(r.cantidad),
    })),
  };
};

const getUsuariosNuevos = async () => {
  const meses = generarUltimosMeses(MESES_HISTORICO);
  const desde = haceMeses(MESES_HISTORICO - 1);

  const filas = await Usuario.findAll({
    attributes: [
      [fn("TO_CHAR", col("Usuario.createdAt"), "YYYY-MM"), "mes"],
      [fn("COUNT", col("Usuario.email")), "cantidad"],
    ],
    where: {
      activo: true,
      createdAt: { [Op.gte]: desde },
    },
    group: [fn("TO_CHAR", col("Usuario.createdAt"), "YYYY-MM")],
    order: [[fn("TO_CHAR", col("Usuario.createdAt"), "YYYY-MM"), "ASC"]],
    raw: true,
  });

  const mapa = mapMesCantidad(filas);
  const serie = completarMeses(meses, mapa);

  return {
    meses: MESES_HISTORICO,
    serie,
    total_periodo: serie.reduce((acc, item) => acc + item.cantidad, 0),
  };
};

const getIngresos = async () => {
  const meses = generarUltimosMeses(MESES_HISTORICO);
  const desde = haceMeses(MESES_HISTORICO - 1);
  const mesActual = mesActualIso();

  const whereCompletado = { estado: "COMPLETADO" };

  const porMesFilas = await Pago.findAll({
    attributes: [
      [fn("TO_CHAR", col("fecha"), "YYYY-MM"), "mes"],
      [fn("SUM", col("monto")), "total"],
    ],
    where: {
      ...whereCompletado,
      fecha: { [Op.gte]: desde },
    },
    group: [fn("TO_CHAR", col("fecha"), "YYYY-MM")],
    order: [[fn("TO_CHAR", col("fecha"), "YYYY-MM"), "ASC"]],
    raw: true,
  });

  const totalHistorico = await Pago.sum("monto", { where: whereCompletado });

  const [anioStr, mesStr] = mesActual.split("-");
  const inicioMesActual = new Date(Number(anioStr), Number(mesStr) - 1, 1);
  const inicioMesSiguiente = new Date(Number(anioStr), Number(mesStr), 1);

  const mesActualTotal = await Pago.sum("monto", {
    where: {
      ...whereCompletado,
      fecha: {
        [Op.gte]: inicioMesActual,
        [Op.lt]: inicioMesSiguiente,
      },
    },
  });

  const mapaMes = new Map(
    porMesFilas.map((f) => [String(f.mes), toNumber(f.total)]),
  );

  return {
    mes_actual: {
      mes: mesActual,
      total: toNumber(mesActualTotal),
    },
    por_mes: meses.map((mes) => ({
      mes,
      total: mapaMes.get(mes) ?? 0,
    })),
    total_historico: toNumber(totalHistorico),
  };
};

const getHorariosPopulares = async () => {
  // Reservas activas por clase vigente. Luego agregamos por día + franja horaria
  // para conocer la demanda global de cada horario, sumando todas las clases y
  // actividades que caen en ese mismo día y hora.
  const filas = await ReservaClase.findAll({
    attributes: [
      "clase_id",
      [fn("COUNT", col("ReservaClase.id")), "total_reservas"],
    ],
    where: { estado: "ACTIVA" },
    include: [
      {
        model: Clase,
        as: "clase",
        attributes: ["id", "dia_semana", "hora_inicio", "hora_fin", "cupo"],
        // Solo clases vigentes: si la clase se eliminó (activa: false) no debe
        // figurar entre los horarios más seleccionados, aunque conserve reservas
        // viejas en estado ACTIVA. required: true descarta reservas huérfanas.
        where: { activa: true },
        required: true,
      },
    ],
    group: [
      "clase_id",
      "clase.id",
      "clase.dia_semana",
      "clase.hora_inicio",
      "clase.hora_fin",
      "clase.cupo",
    ],
    subQuery: false,
  });

  return { top: agruparPorFranja(filas).slice(0, TOP_HORARIOS) };
};

// Agrupa reservas (una fila por clase) en franjas día + hora, sumando reservas y
// cupos de todas las clases que comparten ese horario. Devuelve las franjas
// ordenadas de mayor a menor demanda.
const agruparPorFranja = (filas) => {
  const porFranja = new Map();

  for (const f of filas) {
    const clase = f.clase;
    const dia = clase?.dia_semana ?? "";
    const horaInicio = String(clase?.hora_inicio ?? "").slice(0, 5);
    const horaFin = String(clase?.hora_fin ?? "").slice(0, 5);
    const key = `${dia}|${horaInicio}|${horaFin}`;

    const acc = porFranja.get(key) ?? {
      dia_semana: dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      total_reservas: 0,
      cupo: 0,
    };
    acc.total_reservas += Number(f.get("total_reservas"));
    acc.cupo += Number(clase?.cupo ?? 0);
    porFranja.set(key, acc);
  }

  return [...porFranja.values()]
    .sort((a, b) => b.total_reservas - a.total_reservas)
    .map((s) => ({
      dia_semana: s.dia_semana,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
      horario: `${s.dia_semana} ${s.hora_inicio}${s.hora_fin ? `–${s.hora_fin}` : ""}`.trim(),
      total_reservas: s.total_reservas,
      cupo: s.cupo,
      ocupacion_pct: s.cupo > 0 ? Math.round((s.total_reservas / s.cupo) * 100) : null,
    }));
};

const getIngresosMensuales = async ({ anio, actividadId } = {}) => {
  const year = Number.parseInt(anio, 10);
  if (!Number.isInteger(year)) {
    throw httpError(400, "El año del reporte es obligatorio");
  }

  const inicioAnio = new Date(year, 0, 1);
  const inicioAnioSiguiente = new Date(year + 1, 0, 1);

  const where = {
    estado: "COMPLETADO",
    fecha: { [Op.gte]: inicioAnio, [Op.lt]: inicioAnioSiguiente },
  };

  const include = [];
  let categoria = { id: null, nombre: "Todas las clases" };

  if (actividadId != null) {
    const actividad = await Actividad.findByPk(actividadId, {
      attributes: ["id", "nombre"],
    });
    if (!actividad) {
      throw httpError(404, "Categoría (actividad) no encontrada");
    }
    categoria = { id: actividad.id, nombre: actividad.nombre };

    // Un pago se asocia a una actividad por la inscripción mensual (MENSUALIDAD)
    // o por la reserva → clase (CLASE_SUELTA).
    where[Op.or] = [
      { "$reserva.clase.actividad_id$": actividad.id },
      { "$inscripcionMensual.actividad_id$": actividad.id },
    ];

    include.push(
      {
        model: ReservaClase,
        as: "reserva",
        attributes: [],
        required: false,
        include: [{ model: Clase, as: "clase", attributes: [], required: false }],
      },
      {
        model: InscripcionMensual,
        as: "inscripcionMensual",
        attributes: [],
        required: false,
      },
    );
  }

  const filas = await Pago.findAll({
    attributes: [
      [fn("TO_CHAR", col("Pago.fecha"), "YYYY-MM"), "mes"],
      [fn("SUM", col("Pago.monto")), "total"],
    ],
    where,
    include,
    group: [fn("TO_CHAR", col("Pago.fecha"), "YYYY-MM")],
    order: [[fn("SUM", col("Pago.monto")), "DESC"]],
    subQuery: false,
    raw: true,
  });

  const meses = filas.map((f) => {
    const numeroMes = Number.parseInt(String(f.mes).slice(5, 7), 10);
    return {
      mes: f.mes,
      nombre_mes: NOMBRES_MESES[numeroMes - 1] ?? f.mes,
      total: toNumber(f.total),
    };
  });

  const totalAnual = meses.reduce((acc, m) => acc + m.total, 0);

  return {
    anio: year,
    categoria,
    hay_datos: meses.length > 0,
    mensaje:
      meses.length > 0
        ? null
        : `No hay ingresos registrados en el año ${year}.`,
    total_anual: totalAnual,
    meses,
  };
};

const getHorariosSeleccionados = async ({ anio } = {}) => {
  const year = Number.parseInt(anio, 10);
  if (!Number.isInteger(year)) {
    throw httpError(400, "El año del reporte es obligatorio");
  }

  const inicioAnio = `${year}-01-01`;
  const finAnio = `${year}-12-31`;

  // Demanda por franja horaria = reservas del año a cada clase vigente,
  // agrupadas luego por día + hora (todas las clases y actividades juntas).
  const filas = await ReservaClase.findAll({
    attributes: [
      "clase_id",
      [fn("COUNT", col("ReservaClase.id")), "total_reservas"],
    ],
    where: {
      estado: "ACTIVA",
      fecha_exacta: { [Op.between]: [inicioAnio, finAnio] },
    },
    include: [
      {
        model: Clase,
        as: "clase",
        // Solo clases vigentes: las eliminadas (activa: false) no figuran.
        attributes: ["id", "dia_semana", "hora_inicio", "hora_fin", "cupo"],
        where: { activa: true },
        required: true,
      },
    ],
    group: [
      "clase_id",
      "clase.id",
      "clase.dia_semana",
      "clase.hora_inicio",
      "clase.hora_fin",
      "clase.cupo",
    ],
    subQuery: false,
  });

  const horarios = agruparPorFranja(filas);

  return {
    anio: year,
    hay_datos: horarios.length > 0,
    mensaje:
      horarios.length > 0
        ? null
        : `No hubo reservas registradas durante el ${year}.`,
    horarios,
  };
};

const getUsuariosNuevosAnual = async ({ anio } = {}) => {
  const year = Number.parseInt(anio, 10);
  if (!Number.isInteger(year)) {
    throw httpError(400, "El año del reporte es obligatorio");
  }

  const inicioAnio = new Date(year, 0, 1);
  const inicioAnioSiguiente = new Date(year + 1, 0, 1);

  // Usuarios nuevos = usuarios dados de alta en el año, agrupados por mes y
  // ordenados de mayor a menor por cantidad.
  const filas = await Usuario.findAll({
    attributes: [
      [fn("TO_CHAR", col("Usuario.createdAt"), "YYYY-MM"), "mes"],
      [fn("COUNT", col("Usuario.email")), "cantidad"],
    ],
    where: {
      activo: true,
      createdAt: { [Op.gte]: inicioAnio, [Op.lt]: inicioAnioSiguiente },
    },
    group: [fn("TO_CHAR", col("Usuario.createdAt"), "YYYY-MM")],
    order: [[fn("COUNT", col("Usuario.email")), "DESC"]],
    raw: true,
  });

  const meses = filas.map((f) => {
    const numeroMes = Number.parseInt(String(f.mes).slice(5, 7), 10);
    return {
      mes: f.mes,
      nombre_mes: NOMBRES_MESES[numeroMes - 1] ?? f.mes,
      cantidad: Number(f.cantidad),
    };
  });

  const totalAnual = meses.reduce((acc, m) => acc + m.cantidad, 0);

  return {
    anio: year,
    hay_datos: meses.length > 0,
    mensaje:
      meses.length > 0
        ? null
        : `No existen usuarios nuevos en el año ${year}.`,
    total_anual: totalAnual,
    meses,
  };
};

module.exports = {
  getTotalUsuarios,
  getUsuariosNuevos,
  getUsuariosNuevosAnual,
  getIngresos,
  getIngresosMensuales,
  getHorariosPopulares,
  getHorariosSeleccionados,
};
