"use strict";

const bcrypt = require("bcrypt");
const { sumarUnMes } = require("../src/utils/fechas");

const DEMO_PASSWORD = "12345678";
const FICHA_MEDICA_DEMO = "data:application/pdf;base64,JVBERi0xLjQK";
const CUPO_MINIMO = 10;

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DIAS_NUM = { Lunes: 1, Martes: 2, Miercoles: 3, Jueves: 4, Viernes: 5, Sabado: 6 };

const pad2 = (n) => String(n).padStart(2, "0");

const fechaIso = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Próxima fecha calendario para un día de semana fijo (horario estable del negocio). */
const proximaFecha = (diaSemana, refDate = new Date()) => {
  const objetivo = typeof diaSemana === "number" ? diaSemana : DIAS_NUM[diaSemana];
  if (objetivo === undefined) throw new Error(`Día de semana inválido: ${diaSemana}`);
  const cursor = new Date(refDate);
  cursor.setHours(0, 0, 0, 0);
  const diff = (objetivo - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + diff);
  return fechaIso(cursor);
};

const sumarMeses = (date, meses) => {
  const base = fechaIso(date);
  let cursor = base;
  for (let i = 0; i < meses; i += 1) {
    cursor = sumarUnMes(cursor);
  }
  return new Date(`${cursor}T12:00:00`);
};

const sumarDias = (date, dias) => {
  const d = new Date(date);
  d.setDate(d.getDate() + dias);
  return d;
};

const rangoValidezVale = (refDate = new Date(), diasDesde = -15, diasHasta = 60) => ({
  valido_desde: fechaIso(sumarDias(refDate, diasDesde)),
  valido_hasta: fechaIso(sumarDias(refDate, diasHasta)),
});

const precioIndividual = (precioActividad) => Number((Number(precioActividad) * 0.333).toFixed(2));

const hashDemo = async () => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(DEMO_PASSWORD, salt);
};

const obtenerRolCliente = async (queryInterface) => {
  const [roles] = await queryInterface.sequelize.query(
    `SELECT id FROM roles WHERE nombre = 'CLIENTE' LIMIT 1`,
  );
  return roles[0]?.id ?? null;
};

const asegurarCliente = async (
  queryInterface,
  { email, dni, nombre, apellido, rolId, hash, now, genero = "masculino" },
) => {
  const [existente] = await queryInterface.sequelize.query(
    `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
    { replacements: { email } },
  );

  if (existente.length === 0) {
    await queryInterface.bulkInsert("usuarios", [
      {
        email,
        dni,
        nombre,
        apellido,
        password: hash,
        activo: true,
        rol_id: rolId,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await queryInterface.bulkInsert("clientes", [
      {
        usuario_email: email,
        genero,
        fechaNacimiento: "1990-06-15",
        fichaMedica: FICHA_MEDICA_DEMO,
        direccion: `Calle Demo ${dni}, CABA`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    return;
  }

  await queryInterface.sequelize.query(
    `UPDATE usuarios SET password = :hash, "updatedAt" = :now WHERE email = :email`,
    { replacements: { hash, now, email } },
  );
  await queryInterface.sequelize.query(
    `UPDATE clientes SET
      "fichaMedica" = COALESCE("fichaMedica", :ficha),
      "updatedAt" = :now
     WHERE "usuario_email" = :email`,
    { replacements: { email, ficha: FICHA_MEDICA_DEMO, now } },
  );
};

const asegurarClientesRango = async (queryInterface, desde, hasta, now) => {
  const rolId = await obtenerRolCliente(queryInterface);
  if (!rolId) return 0;
  const hash = await hashDemo();
  let creados = 0;
  for (let i = desde; i <= hasta; i++) {
    const email = `cliente${i}@test.com`;
    const dni = String(66666660 + i);
    const [prev] = await queryInterface.sequelize.query(
      `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
      { replacements: { email } },
    );
    await asegurarCliente(queryInterface, {
      email,
      dni,
      nombre: "Cliente",
      apellido: `Demo ${i}`,
      rolId,
      hash,
      now,
      genero: i % 2 === 0 ? "femenino" : "masculino",
    });
    if (prev.length === 0) creados++;
  }
  return creados;
};

const obtenerActividad = async (queryInterface, nombre) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, precio FROM actividades WHERE nombre = :nombre LIMIT 1`,
    { replacements: { nombre } },
  );
  return rows[0] ?? null;
};

const obtenerSala = async (queryInterface, identificador) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM salas WHERE "identificador" = :identificador LIMIT 1`,
    { replacements: { identificador } },
  );
  return rows[0]?.id ?? null;
};

const obtenerProfesor = async (queryInterface, offset = 0) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM profesores ORDER BY id ASC OFFSET :offset LIMIT 1`,
    { replacements: { offset } },
  );
  return rows[0]?.id ?? null;
};

const obtenerClasePorNombre = async (queryInterface, nombre) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, actividad_id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
    { replacements: { nombre } },
  );
  return rows[0] ?? null;
};

/** Idempotente: reemplaza vale demo por cliente + clase + tipo + monto. */
const upsertValeDemo = async (queryInterface, spec, now) => {
  const {
    cliente_email,
    clase_id,
    tipo,
    monto,
    valido_desde,
    valido_hasta,
    usado_en_pago_id = null,
  } = spec;

  await queryInterface.sequelize.query(
    `DELETE FROM vales
     WHERE cliente_email = :cliente_email
       AND clase_id = :clase_id
       AND tipo = :tipo
       AND monto = :monto`,
    { replacements: { cliente_email, clase_id, tipo, monto } },
  );

  await queryInterface.bulkInsert("vales", [
    {
      cliente_email,
      clase_id,
      tipo,
      monto,
      valido_desde,
      valido_hasta,
      usado_en_pago_id,
      createdAt: now,
      updatedAt: now,
    },
  ]);
};

const upsertClase = async (queryInterface, spec, now) => {
  const cupo = Math.max(CUPO_MINIMO, spec.cupo ?? CUPO_MINIMO);
  const [existente] = await queryInterface.sequelize.query(
    `SELECT id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
    { replacements: { nombre: spec.nombre } },
  );

  if (existente.length > 0) {
    await queryInterface.sequelize.query(
      `UPDATE clases SET
        dia_semana = :dia,
        hora_inicio = :inicio,
        hora_fin = :fin,
        cupo = :cupo,
        actividad_id = :actividadId,
        sala_id = :salaId,
        profesor_id = :profesorId,
        activa = true,
        "updatedAt" = :now
       WHERE id = :id`,
      {
        replacements: {
          id: existente[0].id,
          dia: spec.dia_semana,
          inicio: spec.hora_inicio,
          fin: spec.hora_fin,
          cupo,
          actividadId: spec.actividad_id,
          salaId: spec.sala_id,
          profesorId: spec.profesor_id,
          now,
        },
      },
    );
    return existente[0].id;
  }

  await queryInterface.bulkInsert("clases", [
    {
      nombre: spec.nombre,
      dia_semana: spec.dia_semana,
      hora_inicio: spec.hora_inicio,
      hora_fin: spec.hora_fin,
      cupo,
      activa: true,
      actividad_id: spec.actividad_id,
      sala_id: spec.sala_id,
      profesor_id: spec.profesor_id,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const [nueva] = await queryInterface.sequelize.query(
    `SELECT id FROM clases WHERE nombre = :nombre ORDER BY id DESC LIMIT 1`,
    { replacements: { nombre: spec.nombre } },
  );
  return nueva[0].id;
};

const limpiarDatosClase = async (queryInterface, claseId) => {
  await queryInterface.sequelize.query(`DELETE FROM lista_espera WHERE clase_id = :claseId`, {
    replacements: { claseId },
  });
  await queryInterface.sequelize.query(`DELETE FROM reservas_clase WHERE clase_id = :claseId`, {
    replacements: { claseId },
  });
  await queryInterface.sequelize.query(
    `DELETE FROM inscripciones_individuales WHERE clase_id = :claseId`,
    { replacements: { claseId } },
  );
  await queryInterface.sequelize.query(
    `DELETE FROM inscripciones_mensuales WHERE clase_id = :claseId`,
    { replacements: { claseId } },
  );
};

const limpiarTodasLasReservas = async (queryInterface) => {
  await queryInterface.sequelize.query(`UPDATE vales SET usado_en_pago_id = NULL WHERE usado_en_pago_id IS NOT NULL`);
  await queryInterface.sequelize.query(`DELETE FROM lista_espera`);
  await queryInterface.sequelize.query(`DELETE FROM reservas_clase`);
  await queryInterface.sequelize.query(`DELETE FROM inscripciones_individuales`);
  await queryInterface.sequelize.query(`DELETE FROM inscripciones_mensuales`);
};

const archivarClasesFueraDeCatalogo = async (queryInterface, nombresPermitidos, now = new Date()) => {
  const [extras] = await queryInterface.sequelize.query(
    `SELECT id, nombre FROM clases WHERE "deletedAt" IS NULL AND nombre NOT IN (:nombres)`,
    { replacements: { nombres: nombresPermitidos } },
  );
  for (const c of extras) {
    await limpiarDatosClase(queryInterface, c.id);
    await queryInterface.sequelize.query(
      `UPDATE clases SET "deletedAt" = :now, activa = false, "updatedAt" = :now WHERE id = :id`,
      { replacements: { now, id: c.id } },
    );
  }
  if (extras.length > 0) {
    console.info(`[demo-helpers] ${extras.length} clase(s) fuera de catálogo archivadas.`);
  }
};

const eliminarClaseDemo = async (queryInterface, nombre) => {
  const [clase] = await queryInterface.sequelize.query(
    `SELECT id FROM clases WHERE nombre = :nombre LIMIT 1`,
    { replacements: { nombre } },
  );
  if (clase.length === 0) return;
  await limpiarDatosClase(queryInterface, clase[0].id);
  await queryInterface.bulkDelete("clases", { nombre }, {});
};

/** El gimnasio no abre los domingos: limpia clases demo heredadas. */
const eliminarClasesDomingo = async (queryInterface) => {
  const now = new Date();
  const [clases] = await queryInterface.sequelize.query(
    `SELECT id, nombre FROM clases WHERE dia_semana = 'Domingo' AND "deletedAt" IS NULL`,
  );
  for (const c of clases) {
    await limpiarDatosClase(queryInterface, c.id);
    await queryInterface.sequelize.query(
      `UPDATE clases SET "deletedAt" = :now, "updatedAt" = :now WHERE id = :id`,
      { replacements: { now, id: c.id } },
    );
  }
  if (clases.length > 0) {
    console.info(`[demo-helpers] ${clases.length} clase(s) de domingo eliminadas.`);
  }
};

const crearReservaIndividual = async (
  queryInterface,
  {
    email,
    claseId,
    actividadId,
    fecha,
    precioActividad,
    estadoReserva = "ACTIVA",
    now,
  },
) => {
  const monto = precioIndividual(precioActividad);
  const [existente] = await queryInterface.sequelize.query(
    `SELECT id FROM reservas_clase
     WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha
       AND estado IN ('ACTIVA', 'PENDIENTE_PAGO')
     LIMIT 1`,
    { replacements: { email, claseId, fecha } },
  );
  if (existente.length > 0) return existente[0].id;

  await queryInterface.bulkInsert("inscripciones_individuales", [
    {
      cliente_email: email,
      actividad_id: actividadId,
      clase_id: claseId,
      fecha,
      modalidad: "COMPLETO",
      estado_seña: null,
      vencimiento_seña: null,
      monto_total: monto,
      monto_pagado: monto,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const [inscripcion] = await queryInterface.sequelize.query(
    `SELECT id FROM inscripciones_individuales
     WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha
     ORDER BY id DESC LIMIT 1`,
    { replacements: { email, claseId, fecha } },
  );

  await queryInterface.bulkInsert("reservas_clase", [
    {
      cliente_email: email,
      clase_id: claseId,
      fecha_exacta: fecha,
      asistio: null,
      estado: estadoReserva,
      inscripcion_mensual_id: null,
      inscripcion_individual_id: inscripcion[0].id,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const [reserva] = await queryInterface.sequelize.query(
    `SELECT id FROM reservas_clase
     WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha
     ORDER BY id DESC LIMIT 1`,
    { replacements: { email, claseId, fecha } },
  );
  return reserva[0].id;
};

const crearInscripcionMensual = async (
  queryInterface,
  {
    email,
    claseId,
    actividadId,
    precioActividad,
    estado = "VIGENTE",
    now,
  },
) => {
  const periodoInicio = fechaIso(now);
  const periodoFin = sumarUnMes(periodoInicio);

  const [existente] = await queryInterface.sequelize.query(
    `SELECT id FROM inscripciones_mensuales
     WHERE cliente_email = :email AND clase_id = :claseId AND estado IN ('VIGENTE', 'EN_GRACIA', 'PENDIENTE_PAGO', 'SUSPENDIDA')
     ORDER BY id DESC LIMIT 1`,
    { replacements: { email, claseId } },
  );

  if (existente.length > 0) {
    await queryInterface.sequelize.query(
      `UPDATE inscripciones_mensuales SET
        estado = :estado,
        periodo_inicio = :inicio,
        periodo_fin = :fin,
        dia_vencimiento = :fin,
        monto = :monto,
        "updatedAt" = :now
       WHERE id = :id`,
      {
        replacements: {
          id: existente[0].id,
          estado,
          inicio: periodoInicio,
          fin: periodoFin,
          monto: precioActividad,
          now,
        },
      },
    );
    return existente[0].id;
  }

  await queryInterface.bulkInsert("inscripciones_mensuales", [
    {
      cliente_email: email,
      actividad_id: actividadId,
      clase_id: claseId,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      dia_vencimiento: periodoFin,
      estado,
      monto: precioActividad,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const [ins] = await queryInterface.sequelize.query(
    `SELECT id FROM inscripciones_mensuales
     WHERE cliente_email = :email AND clase_id = :claseId
     ORDER BY id DESC LIMIT 1`,
    { replacements: { email, claseId } },
  );
  return ins[0].id;
};

module.exports = {
  DEMO_PASSWORD,
  FICHA_MEDICA_DEMO,
  CUPO_MINIMO,
  DIAS,
  DIAS_NUM,
  pad2,
  fechaIso,
  proximaFecha,
  sumarMeses,
  sumarDias,
  rangoValidezVale,
  precioIndividual,
  hashDemo,
  obtenerRolCliente,
  asegurarCliente,
  asegurarClientesRango,
  obtenerActividad,
  obtenerSala,
  obtenerProfesor,
  obtenerClasePorNombre,
  upsertValeDemo,
  upsertClase,
  limpiarDatosClase,
  limpiarTodasLasReservas,
  archivarClasesFueraDeCatalogo,
  eliminarClaseDemo,
  eliminarClasesDomingo,
  crearReservaIndividual,
  crearInscripcionMensual,
};
