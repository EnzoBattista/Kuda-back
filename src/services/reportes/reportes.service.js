const { Op, fn, col, literal } = require("sequelize");
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
  const total = await Usuario.count();

  const porRol = await Usuario.findAll({
    attributes: [
      [col("rol.nombre"), "rol"],
      [fn("COUNT", col("Usuario.email")), "cantidad"],
    ],
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

  const porMetodoFilas = await Pago.findAll({
    attributes: [
      [col("metodo"), "metodo"],
      [fn("SUM", col("monto")), "total"],
    ],
    where: whereCompletado,
    group: [col("metodo")],
    order: [[fn("SUM", col("monto")), "DESC"]],
    raw: true,
  });

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
    por_metodo: porMetodoFilas.map((f) => ({
      metodo: f.metodo,
      total: toNumber(f.total),
    })),
    total_historico: porMetodoFilas.reduce((acc, f) => acc + toNumber(f.total), 0),
  };
};

const getHorariosPopulares = async () => {
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
        attributes: ["id", "nombre", "dia_semana", "hora_inicio", "hora_fin", "cupo"],
        include: [{ model: Actividad, as: "actividad", attributes: ["nombre"] }],
      },
    ],
    group: [
      "clase_id",
      "clase.id",
      "clase.nombre",
      "clase.dia_semana",
      "clase.hora_inicio",
      "clase.hora_fin",
      "clase.cupo",
      "clase->actividad.id",
      "clase->actividad.nombre",
    ],
    order: [[literal("total_reservas"), "DESC"]],
    limit: TOP_HORARIOS,
    subQuery: false,
  });

  return {
    top: filas.map((f) => {
      const clase = f.clase;
      const reservas = Number(f.get("total_reservas"));
      const cupo = Number(clase?.cupo ?? 0);
      return {
        clase_id: f.clase_id,
        nombre: clase?.actividad?.nombre ?? clase?.nombre ?? "Clase",
        dia_semana: clase?.dia_semana,
        hora_inicio: clase?.hora_inicio,
        hora_fin: clase?.hora_fin,
        horario: `${clase?.dia_semana ?? ""} ${clase?.hora_inicio ?? ""}`.trim(),
        total_reservas: reservas,
        cupo,
        ocupacion_pct: cupo > 0 ? Math.round((reservas / cupo) * 100) : null,
      };
    }),
  };
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

const getHorariosSeleccionados = async ({ anio, actividadId } = {}) => {
  const year = Number.parseInt(anio, 10);
  if (!Number.isInteger(year)) {
    throw httpError(400, "El año del reporte es obligatorio");
  }

  const inicioAnio = `${year}-01-01`;
  const finAnio = `${year}-12-31`;

  let categoria = { id: null, nombre: "Todas las clases" };
  const claseWhere = {};

  if (actividadId != null) {
    const actividad = await Actividad.findByPk(actividadId, {
      attributes: ["id", "nombre"],
    });
    if (!actividad) {
      throw httpError(404, "Categoría (actividad) no encontrada");
    }
    categoria = { id: actividad.id, nombre: actividad.nombre };
    claseWhere.actividad_id = actividad.id;
  }

  // Demanda por horario = reservas del año a cada clase, agrupadas por horario
  // (clase) y ordenadas de mayor a menor.
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
        attributes: ["id", "nombre", "dia_semana", "hora_inicio", "hora_fin", "cupo"],
        where: claseWhere,
        required: true,
        include: [{ model: Actividad, as: "actividad", attributes: ["id", "nombre"] }],
      },
    ],
    group: [
      "clase_id",
      "clase.id",
      "clase.nombre",
      "clase.dia_semana",
      "clase.hora_inicio",
      "clase.hora_fin",
      "clase.cupo",
      "clase->actividad.id",
      "clase->actividad.nombre",
    ],
    order: [[literal("total_reservas"), "DESC"]],
    subQuery: false,
  });

  const horarios = filas.map((f) => {
    const clase = f.clase;
    const horaInicio = String(clase?.hora_inicio ?? "").slice(0, 5);
    const horaFin = String(clase?.hora_fin ?? "").slice(0, 5);
    return {
      clase_id: f.clase_id,
      actividad: clase?.actividad?.nombre ?? clase?.nombre ?? "Clase",
      nombre: clase?.nombre,
      dia_semana: clase?.dia_semana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      horario: `${clase?.dia_semana ?? ""} ${horaInicio}${horaFin ? `-${horaFin}` : ""}`.trim(),
      cupo: Number(clase?.cupo ?? 0),
      total_reservas: Number(f.get("total_reservas")),
    };
  });

  return {
    anio: year,
    categoria,
    hay_datos: horarios.length > 0,
    mensaje:
      horarios.length > 0
        ? null
        : `No hubo inscripciones a la categoría "${categoria.nombre}" durante el ${year}.`,
    horarios,
  };
};

module.exports = {
  getTotalUsuarios,
  getUsuariosNuevos,
  getIngresos,
  getIngresosMensuales,
  getHorariosPopulares,
  getHorariosSeleccionados,
};
