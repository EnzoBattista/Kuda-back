const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

const sumarUnMes = (fechaIso) => {
  const d = new Date(fechaIso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Devuelve todas las fechas (YYYY-MM-DD) dentro del rango [inicio, fin)
 * que correspondan al día de la semana indicado.
 * @param {string} diaSemana  - Nombre en español: "Lunes", "Martes", ..., "Domingo"
 * @param {string} inicioIso  - Fecha inicio ISO (incluida): "2026-06-01"
 * @param {string} finIso     - Fecha fin ISO (excluida):    "2026-07-01"
 * @returns {string[]}        - Array de fechas "YYYY-MM-DD"
 */
const DIAS_SEMANA_MAP = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
};

const fechasDelMesPorDia = (diaSemana, inicioIso, finIso) => {
  const targetDay = DIAS_SEMANA_MAP[diaSemana];
  if (targetDay === undefined) throw new Error(`Día de semana inválido: ${diaSemana}`);

  const fechas = [];
  // Trabajamos en UTC para evitar desfases de zona horaria
  const cursor = new Date(inicioIso + "T00:00:00Z");
  const fin = new Date(finIso + "T00:00:00Z");

  while (cursor < fin) {
    if (cursor.getUTCDay() === targetDay) {
      fechas.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return fechas;
};

const getFechaHoyLocal = () => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
};

module.exports = { calcularEdad, sumarUnMes, fechasDelMesPorDia, getFechaHoyLocal };
