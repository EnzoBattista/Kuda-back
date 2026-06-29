const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor, CancelacionClase, InscripcionMensual, InscripcionIndividual, ReservaClase, Vale, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { getFechaHoyLocal, getHoraLocal } = require("../../utils/fechas");

const MAPA_DIAS = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
};

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

const validarExistenciasYSolapamientos = async (data, excludeClaseId = null, { isModify = false } = {}) => {
  const { nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, sala_id, profesor_id } = data;

  if (nombre !== undefined && !nombre.trim()) {
    throw httpError(400, "El nombre de la clase no puede estar vacío");
  }
  if (dia_semana !== undefined && !DIAS_SEMANA.includes(dia_semana)) {
    throw httpError(400, "Día de la semana no válido");
  }
  if (dia_semana === "Domingo") {
    throw httpError(400, "No se pueden agendar clases los días Domingo");
  }

  if (hora_inicio && hora_fin && hora_fin <= hora_inicio) {
    throw httpError(400, "La hora de fin debe ser posterior a la hora de inicio");
  }

  if (hora_inicio && hora_inicio.slice(0, 5) < "07:00") {
    throw httpError(400, "La clase no puede iniciar antes de las 07:00hs");
  }

  if (hora_fin && hora_fin.slice(0, 5) > "22:00") {
    throw httpError(400, "La clase no puede finalizar después de las 22:00hs");
  }

  if (hora_inicio && hora_fin) {
    const [hI, mI] = hora_inicio.split(":").map(Number);
    const [hF, mF] = hora_fin.split(":").map(Number);
    const diff = (hF * 60 + mF) - (hI * 60 + mI);
    if (diff > 240) {
      throw httpError(400, "La duración de la clase no puede exceder las 4 horas");
    }
  }

  if (cupo !== undefined && cupo < 10) {
    throw httpError(400, isModify
      ? "No se pudo modificar la clase. El cupo debe ser mayor o igual a 10"
      : "El cupo máximo debe ser mayor o igual al cupo mínimo (10)");
  }

  if (actividad_id) {
    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) throw httpError(400, "La actividad indicada no existe");
  }

  if (sala_id) {
    const sala = await Sala.findByPk(sala_id);
    if (!sala) throw httpError(400, "La sala indicada no existe");
    if (!sala.estado_activo) throw httpError(400, "La sala se encuentra deshabilitada");
  }

  if (profesor_id) {
    const profesor = await Profesor.findByPk(profesor_id);
    if (!profesor) throw httpError(400, "El profesor indicado no existe");
  }

  if (sala_id && dia_semana && hora_inicio && hora_fin) {
    const whereSolapada = {
      sala_id,
      dia_semana,
      activa: true,
      hora_inicio: { [Op.lt]: hora_fin },
      hora_fin: { [Op.gt]: hora_inicio },
    };
    if (excludeClaseId) whereSolapada.id = { [Op.ne]: excludeClaseId };

    const solapada = await Clase.findOne({ where: whereSolapada });
    if (solapada) {
      throw httpError(409, isModify
        ? "No se pudo modificar la clase. La sala esta ocupada en el dia y horario seleccionado"
        : "La sala se encuentra ocupada para ese día y horario");
    }
  }

  if (profesor_id && dia_semana && hora_inicio && hora_fin) {
    const whereProfesor = {
      profesor_id,
      dia_semana,
      activa: true,
      hora_inicio: { [Op.lt]: hora_fin },
      hora_fin: { [Op.gt]: hora_inicio },
    };
    if (excludeClaseId) whereProfesor.id = { [Op.ne]: excludeClaseId };

    const claseProfesor = await Clase.findOne({ where: whereProfesor });
    if (claseProfesor) {
      throw httpError(409, isModify
        ? "No se pudo modificar la clase. El profesor ya tiene una clase en el dia y horario seleccionado"
        : "El profesor se encuentra ocupado para ese día y horario");
    }
  }
};

const crearClase = async (data) => {
  await validarExistenciasYSolapamientos(data);
  return Clase.create(data);
};

const modificarClase = async (id, data) => {
  const clase = await Clase.findByPk(id);
  if (!clase) throw httpError(404, "La clase indicada no existe");

  let huboEspera = false;
  if (data.cupo !== undefined && data.cupo > clase.cupo) {
    // MOCK: asumiendo que si se amplía el cupo, hay gente en lista de espera
    huboEspera = true;
  }

  const merged = {
    dia_semana: data.dia_semana || clase.dia_semana,
    hora_inicio: data.hora_inicio || clase.hora_inicio,
    hora_fin: data.hora_fin || clase.hora_fin,
    cupo: data.cupo !== undefined ? data.cupo : clase.cupo,
    actividad_id: data.actividad_id || clase.actividad_id,
    sala_id: data.sala_id || clase.sala_id,
    profesor_id: data.profesor_id || clase.profesor_id,
  };

  // Validar que el cupo no sea menor a la cantidad de inscriptos activos
  if (data.cupo !== undefined) {
    const inscriptosActivos = await InscripcionMensual.count({
      where: {
        clase_id: id,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] },
      },
    });
    if (data.cupo < inscriptosActivos) {
      throw httpError(409, "No se pudo modificar la clase. El cupo debe ser mayor o igual a la cantidad de inscriptos");
    }
  }

  await validarExistenciasYSolapamientos(merged, id, { isModify: true });
  await clase.update(data);
  return { clase, huboEspera };
};

const getClaseById = async (id) => {
  const clase = await Clase.findByPk(id, {
    include: [
      { model: Actividad, as: "actividad" },
      { model: Sala, as: "sala" },
      { model: Profesor, as: "profesor" },
    ],
  });

  if (!clase) throw httpError(404, "Clase no encontrada");

  const cancelaciones = await CancelacionClase.findAll({
    where: { clase_id: id },
    attributes: ["fecha"],
  });
  const fechasCanceladas = cancelaciones.map((c) => c.fecha);

  const proximasFechas = [];
  let actual = new Date();
  const diaObjetivo = MAPA_DIAS[clase.dia_semana];

  while (actual.getDay() !== diaObjetivo) {
    actual.setDate(actual.getDate() + 1);
  }

  let generadas = 0;
  // Limitar la visualización de clases a 30 días máximo.
  let intentos = 0;
  const hoy30 = new Date();
  hoy30.setDate(hoy30.getDate() + 30);
  const limiteStr = `${hoy30.getFullYear()}-${String(hoy30.getMonth() + 1).padStart(2, '0')}-${String(hoy30.getDate()).padStart(2, '0')}`;

  while (intentos < 10) { // Un mes son máx 5 semanas
    const yyyy = actual.getFullYear();
    const mm = String(actual.getMonth() + 1).padStart(2, '0');
    const dd = String(actual.getDate()).padStart(2, '0');
    const fechaStr = `${yyyy}-${mm}-${dd}`;

    if (fechaStr > limiteStr) {
      break;
    }

    const hoyStr = getFechaHoyLocal();
    const horaActual = getHoraLocal();
    if (fechaStr === hoyStr && clase.hora_inicio < horaActual) {
      actual.setDate(actual.getDate() + 7);
      intentos++;
      continue;
    }

    if (!fechasCanceladas.includes(fechaStr)) {
      proximasFechas.push(fechaStr);
      generadas++;
    }
    actual.setDate(actual.getDate() + 7);
    intentos++;
  }

  return {
    ...clase.toJSON(),
    proximas_fechas: proximasFechas,
  };
};

const deleteClase = async (id) => {
  const clase = await Clase.findByPk(id);
  if (!clase) throw httpError(404, "Clase no encontrada");

  const hoy = getFechaHoyLocal();

  const reservasActivasFuturas = await ReservaClase.count({
    where: {
      clase_id: id,
      estado: "ACTIVA",
      fecha_exacta: { [Op.gte]: hoy },
    },
  });

  if (reservasActivasFuturas > 0) {
    throw httpError(409, "No se puede eliminar la clase porque tiene clientes inscriptos");
  }

  await clase.update({ activa: false });
  return { message: "La clase fue eliminada exitosamente" };
};

const cancelarFechaClase = async (claseId, data) => {
  const { fecha, motivo } = data;
  if (!fecha) throw httpError(400, "Debe proveer una fecha a cancelar");

  const clase = await Clase.findByPk(claseId);
  if (!clase) throw httpError(404, "Clase no encontrada");

  const fechaObj = new Date(`${fecha}T12:00:00Z`); // Mediodía UTC para evitar desfase de timezone
  if (fechaObj.getDay() !== MAPA_DIAS[clase.dia_semana]) {
    throw httpError(400, `La fecha ${fecha} no es un ${clase.dia_semana}`);
  }

  const hoyStr = getFechaHoyLocal();
  if (fecha < hoyStr) {
    throw httpError(400, "No se puede cancelar una clase pasada");
  }

  const existente = await CancelacionClase.findOne({
    where: { clase_id: claseId, fecha },
  });

  if (existente) {
    throw httpError(409, "Esta fecha ya se encuentra cancelada");
  }

  return conn.transaction(async (transaction) => {
    const cancelacion = await CancelacionClase.create(
      { clase_id: claseId, fecha, motivo },
      { transaction }
    );

    // Cancelar las reservas activas de esa fecha y otorgar un vale por el
    // valor de la clase a cada cliente afectado.
    const reservasActivas = await ReservaClase.findAll({
      where: { clase_id: claseId, fecha_exacta: fecha, estado: "ACTIVA" },
      transaction,
    });

    const hoy = new Date();
    const validoDesde = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);
    const validoHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0)
      .toISOString()
      .slice(0, 10);

    let valesGenerados = 0;

    for (const reserva of reservasActivas) {
      reserva.estado = "CANCELADA";
      await reserva.save({ transaction });

      let monto = 0;
      let tipoVale = "MENSUAL";

      if (reserva.inscripcion_individual_id) {
        const ins = await InscripcionIndividual.findByPk(
          reserva.inscripcion_individual_id,
          { transaction }
        );
        if (ins) monto = Number(ins.monto_pagado);
        tipoVale = "INDIVIDUAL";
      } else if (reserva.inscripcion_mensual_id) {
        const ins = await InscripcionMensual.findByPk(
          reserva.inscripcion_mensual_id,
          { transaction }
        );
        if (ins) {
          // El valor de una clase del abonado = monto pagado / cantidad de
          // reservas generadas por esa inscripción (refleja el prorrateo
          // hecho al momento de inscribirse).
          const totalReservas = await ReservaClase.count({
            where: { inscripcion_mensual_id: ins.id },
            transaction,
          });
          if (totalReservas > 0) {
            monto = Number(ins.monto) / totalReservas;
          }
        }
        tipoVale = "MENSUAL";
      }

      if (monto > 0) {
        await Vale.create(
          {
            cliente_email: reserva.cliente_email,
            clase_id: clase.id,
            tipo: tipoVale,
            monto: Number(monto.toFixed(2)),
            valido_desde: validoDesde,
            valido_hasta: validoHasta,
          },
          { transaction }
        );
        valesGenerados += 1;
      }
    }

    return {
      cancelacion,
      reservasCanceladas: reservasActivas.length,
      valesGenerados,
    };
  });
};

/**
 * Verifica si un cliente tiene conflictos para reservar una clase en una fecha.
 * Retorna un objeto { conflicto: boolean, tipo: null|'MISMA_CLASE'|'HORARIO', mensaje: string }
 */
const verificarConflictoReserva = async (claseId, fecha, clienteEmail) => {
  const { validarMoraCliente } = require("../asistencias/asistencias.service");
  try {
    await validarMoraCliente(clienteEmail);
  } catch (err) {
    if (err.status === 403) {
      return {
        conflicto: true,
        tipo: "MORA",
        mensaje: "Tu cuenta se encuentra suspendida por falta de pago. Regularizá tu situación para poder reservar.",
      };
    }
    throw err;
  }

  const clase = await Clase.findByPk(claseId);
  if (!clase) throw httpError(404, "Clase no encontrada");

  const fechaStr = String(fecha).slice(0, 10);

  const mismaClase = await ReservaClase.findOne({
    where: {
      cliente_email: clienteEmail,
      clase_id: claseId,
      fecha_exacta: fechaStr,
      estado: "ACTIVA",
    },
  });
  if (mismaClase) {
    return {
      conflicto: true,
      tipo: "MISMA_CLASE",
      mensaje: "Ya tenés una reserva activa para esta clase.",
    };
  }

  const conflictoHorario = await ReservaClase.findOne({
    where: {
      cliente_email: clienteEmail,
      fecha_exacta: fechaStr,
      estado: "ACTIVA",
      clase_id: { [Op.ne]: claseId },
    },
    include: [{
      model: Clase,
      as: "clase",
      where: {
        hora_inicio: { [Op.lt]: clase.hora_fin },
        hora_fin: { [Op.gt]: clase.hora_inicio },
      },
    }],
  });
  if (conflictoHorario) {
    return {
      conflicto: true,
      tipo: "HORARIO",
      mensaje: "Ya tenés una reserva activa en ese día y horario.",
    };
  }

  return { conflicto: false, tipo: null, mensaje: null };
};

const verificarConflictoMensual = async (claseId, clienteEmail) => {
  const { Clase, ReservaClase, conn } = require("../../../db");
  const { Op } = require("sequelize");
  const { fechasDeClaseEnPeriodo, obtenerCuposOcupados } = require("./reservas.service");
  const { sumarUnMes } = require("../../utils/fechas");
  const { validarMoraCliente } = require("../asistencias/asistencias.service");

  try {
    await validarMoraCliente(clienteEmail);
  } catch (err) {
    if (err.status === 403) {
      return {
        conflicto: true,
        tipo: "MORA",
        mensaje: "Tu cuenta se encuentra suspendida por falta de pago. Regularizá tu situación para poder reservar.",
      };
    }
    throw err;
  }

  const clase = await Clase.findByPk(claseId);
  if (!clase) throw httpError(404, "Clase no encontrada");

  const hoy = getFechaHoyLocal();
  const fin = sumarUnMes(hoy);
  const fechas = fechasDeClaseEnPeriodo(clase.dia_semana, hoy, fin);

  // Buscar si el cliente ya tiene reservas individuales en este período para fusionarlas
  const yaReservadas = await ReservaClase.findAll({
    where: {
      cliente_email: clienteEmail,
      clase_id: claseId,
      fecha_exacta: { [Op.in]: fechas },
      estado: "ACTIVA",
      inscripcion_individual_id: { [Op.ne]: null },
    },
  });
  const setYaReservadas = new Set(yaReservadas.map((r) => String(r.fecha_exacta).slice(0, 10)));
  const fechasAChequear = fechas.filter((f) => !setYaReservadas.has(f));

  // 1. Verificar si hay conflicto de horario (reserva activa en otra clase a la misma hora)
  for (const fecha of fechasAChequear) {
    const conflictoHorario = await ReservaClase.findOne({
      where: {
        cliente_email: clienteEmail,
        fecha_exacta: fecha,
        estado: "ACTIVA",
        clase_id: { [Op.ne]: claseId },
      },
      include: [{
        model: Clase,
        as: "clase",
        where: {
          hora_inicio: { [Op.lt]: clase.hora_fin },
          hora_fin: { [Op.gt]: clase.hora_inicio },
        },
      }],
    });
    if (conflictoHorario) {
      return {
        conflicto: true,
        tipo: "HORARIO",
        mensaje: "Ya tenés una reserva activa en ese día y horario.",
      };
    }
  }

  // 2. Verificar cupo disponible para las fechas nuevas a inscribir
  for (const fecha of fechasAChequear) {
    const ocupadas = await obtenerCuposOcupados(claseId, fecha, clienteEmail);
    if (ocupadas >= clase.cupo) {
      return {
        conflicto: true,
        tipo: "SIN_CUPO",
        mensaje: "No hay cupo suficiente en todas las fechas del mes.",
      };
    }
  }

  return { conflicto: false, tipo: null, mensaje: null };
};

module.exports = {
  crearClase,
  modificarClase,
  getClaseById,
  deleteClase,
  cancelarFechaClase,
  verificarConflictoReserva,
  verificarConflictoMensual,
};
