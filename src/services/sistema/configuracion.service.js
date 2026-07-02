const { ConfiguracionSistema } = require("../../../db");
const httpError = require("../../utils/httpError");

const CONFIG_ID = 1;

const mensajeRecordatorioFueraDeGracia = (dias) =>
  `El recordatorio debe estar dentro de los ${dias} días de gracia para pagar`;

const mensajeGraciaMenorQueRecordatorio =
  "No se puede modificar porque el recordatorio de pago se encuentra fuera de rango";

const mensajeGraciaFueraDeRango =
  "No se puede modificar porque los dias de gracia debe estar en el rango 1-10";

const asegurarConfiguracion = async () => {
  let row = await ConfiguracionSistema.findByPk(CONFIG_ID);
  if (!row) {
    row = await ConfiguracionSistema.create({
      id: CONFIG_ID,
      dias_gracia_mensual: 1,
      recordatorio_pago_dia: 1,
    });
  }
  return row;
};

const getDiasGraciaMensual = async () => {
  const row = await asegurarConfiguracion();
  return Number(row.dias_gracia_mensual);
};

const obtenerConfiguracion = async () => {
  const row = await asegurarConfiguracion();
  return {
    dias_gracia_mensual: Number(row.dias_gracia_mensual),
    recordatorio_pago_dia:
      row.recordatorio_pago_dia != null ? Number(row.recordatorio_pago_dia) : null,
  };
};

const validarDiasGracia = (valor) => {
  if (!Number.isInteger(valor) || valor < 1 || valor > 10) {
    throw httpError(400, mensajeGraciaFueraDeRango);
  }
};

const validarRecordatorio = (valor, diasGracia) => {
  if (!Number.isInteger(valor) || valor < 1 || valor > diasGracia) {
    const diasMsg =
      Number.isInteger(valor) && valor > diasGracia ? valor : diasGracia;
    throw httpError(400, mensajeRecordatorioFueraDeGracia(diasMsg));
  }
};

const actualizarConfiguracion = async (body) => {
  const { dias_gracia_mensual, recordatorio_pago_dia } = body ?? {};
  if (dias_gracia_mensual === undefined && recordatorio_pago_dia === undefined) {
    throw httpError(400, "Se requiere al menos un campo para actualizar");
  }

  const row = await asegurarConfiguracion();
  let nuevosDias = Number(row.dias_gracia_mensual);
  let nuevoRecordatorio =
    row.recordatorio_pago_dia != null ? Number(row.recordatorio_pago_dia) : 1;

  if (dias_gracia_mensual !== undefined) {
    const valor = Number(dias_gracia_mensual);
    validarDiasGracia(valor);
    nuevosDias = valor;
    if (recordatorio_pago_dia === undefined && nuevoRecordatorio > nuevosDias) {
      throw httpError(400, mensajeGraciaMenorQueRecordatorio);
    }
  }

  if (recordatorio_pago_dia !== undefined) {
    const valor = Number(recordatorio_pago_dia);
    validarRecordatorio(valor, nuevosDias);
    nuevoRecordatorio = valor;
  }

  await row.update({
    dias_gracia_mensual: nuevosDias,
    recordatorio_pago_dia: nuevoRecordatorio,
  });

  return {
    dias_gracia_mensual: nuevosDias,
    recordatorio_pago_dia: nuevoRecordatorio,
  };
};

module.exports = {
  getDiasGraciaMensual,
  obtenerConfiguracion,
  actualizarConfiguracion,
  mensajeRecordatorioFueraDeGracia,
  mensajeGraciaMenorQueRecordatorio,
  mensajeGraciaFueraDeRango,
};
