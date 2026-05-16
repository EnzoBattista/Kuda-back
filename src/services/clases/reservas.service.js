const { Op } = require("sequelize");
const { ReservaClase, CancelacionClase } = require("../../../db");
const httpError = require("../../utils/httpError");

// Clase.DIAS_SEMANA -> número de día JS en UTC (getUTCDay: domingo = 0).
const DIA_SEMANA_A_NUMERO = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
};

const aFechaUTC = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const aISO = (fecha) => fecha.toISOString().slice(0, 10);

// Todas las fechas (YYYY-MM-DD) que caen en `diaSemana` dentro del período
// [inicio, fin). El fin se trata como exclusivo: el período pagado va desde
// periodo_inicio hasta el día anterior a periodo_fin, evitando duplicar el
// mismo día de semana en el borde. Da 4 o 5 fechas según el mes.
const fechasDeClaseEnPeriodo = (diaSemana, periodoInicio, periodoFin) => {
  const objetivo = DIA_SEMANA_A_NUMERO[diaSemana];
  if (objetivo === undefined) {
    throw httpError(500, `Día de semana de la clase no reconocido: ${diaSemana}`);
  }

  const fin = aFechaUTC(periodoFin);
  const fechas = [];
  for (let d = aFechaUTC(periodoInicio); d < fin; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === objetivo) {
      fechas.push(aISO(d));
    }
  }
  return fechas;
};

const verificarCupo = async (clase, fechaExacta, transaction) => {
  const ocupadas = await ReservaClase.count({
    where: { clase_id: clase.id, fecha_exacta: fechaExacta, estado: "ACTIVA" },
    transaction,
  });
  if (ocupadas >= clase.cupo) {
    throw httpError(409, `Sin cupo en la clase para la fecha ${fechaExacta}`);
  }
};

// 1 reserva: la fecha puntual de la inscripción individual.
const generarReservasIndividual = async (inscripcion, clase, { transaction }) => {
  if (!clase.activa) {
    throw httpError(409, "La clase no está activa");
  }

  const fecha = String(inscripcion.fecha).slice(0, 10);

  const cancelada = await CancelacionClase.findOne({
    where: { clase_id: clase.id, fecha },
    transaction,
  });
  if (cancelada) {
    throw httpError(409, `La clase está cancelada en la fecha ${fecha}`);
  }

  await verificarCupo(clase, fecha, transaction);

  const reserva = await ReservaClase.create(
    {
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: "ACTIVA",
      inscripcion_individual_id: inscripcion.id,
    },
    { transaction }
  );
  return [reserva];
};

// N reservas: una por cada ocurrencia de la clase dentro del período pagado.
// Estrategia fail-fast: si CUALQUIER fecha requerida no tiene cupo, no se crea
// ninguna reserva y la inscripción se revierte (mejor que entregar un mes
// parcial en silencio). Cambiar acá si se prefiere saltear las fechas llenas.
const generarReservasMensual = async (inscripcion, clase, { transaction }) => {
  if (!clase.activa) {
    throw httpError(409, "La clase no está activa");
  }

  const fechas = fechasDeClaseEnPeriodo(
    clase.dia_semana,
    inscripcion.periodo_inicio,
    inscripcion.periodo_fin
  );

  const canceladas = await CancelacionClase.findAll({
    where: { clase_id: clase.id, fecha: { [Op.in]: fechas } },
    attributes: ["fecha"],
    transaction,
  });
  const setCanceladas = new Set(
    canceladas.map((c) => String(c.fecha).slice(0, 10))
  );

  const fechasValidas = fechas.filter((f) => !setCanceladas.has(f));
  if (fechasValidas.length === 0) {
    throw httpError(
      409,
      "No hay fechas disponibles para la clase en el período (todas canceladas o período sin ocurrencias)"
    );
  }

  const sinCupo = [];
  for (const fecha of fechasValidas) {
    const ocupadas = await ReservaClase.count({
      where: { clase_id: clase.id, fecha_exacta: fecha, estado: "ACTIVA" },
      transaction,
    });
    if (ocupadas >= clase.cupo) {
      sinCupo.push(fecha);
    }
  }
  if (sinCupo.length > 0) {
    throw httpError(
      409,
      `Sin cupo en la clase para: ${sinCupo.join(", ")}. No se generó la inscripción.`
    );
  }

  const reservas = await ReservaClase.bulkCreate(
    fechasValidas.map((fecha) => ({
      cliente_email: inscripcion.cliente_email,
      clase_id: clase.id,
      fecha_exacta: fecha,
      estado: "ACTIVA",
      inscripcion_mensual_id: inscripcion.id,
    })),
    { transaction, validate: true }
  );
  return reservas;
};

module.exports = {
  fechasDeClaseEnPeriodo,
  generarReservasIndividual,
  generarReservasMensual,
};
