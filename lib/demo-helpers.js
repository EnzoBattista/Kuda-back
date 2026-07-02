"use strict";

const bcrypt = require("bcrypt");
const { sumarUnMes, sumarDias: sumarDiasIso, finDeMesCalendario } = require("../src/utils/fechas");

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
  await queryInterface.sequelize.query(
    `DELETE FROM asistencias WHERE clase_id = :claseId`,
    { replacements: { claseId } },
  );
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
  let clases = [];
  try {
    [clases] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM clases WHERE dia_semana::text = 'Domingo' AND "deletedAt" IS NULL`,
    );
  } catch {
    return;
  }
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
  const periodoFin = finDeMesCalendario(periodoInicio);

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

const fechasDiaEnPeriodoIso = (diaSemana, periodoInicio, periodoFin) => {
  const objetivo = DIAS_NUM[diaSemana];
  const fechas = [];
  const cursor = new Date(`${periodoInicio}T12:00:00`);
  const fin = new Date(`${periodoFin}T12:00:00`);
  while (cursor <= fin) {
    if (cursor.getDay() === objetivo) {
      fechas.push(fechaIso(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fechas;
};

const insertarInscripcionMensualDemo = async (
  queryInterface,
  {
    email,
    claseId,
    actividadId,
    periodoInicio,
    periodoFin,
    estado,
    monto,
    inscripcionAnteriorId = null,
    now,
  },
) => {
  await queryInterface.bulkInsert("inscripciones_mensuales", [
    {
      cliente_email: email,
      actividad_id: actividadId,
      clase_id: claseId,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      dia_vencimiento: periodoFin,
      estado,
      monto,
      inscripcion_anterior_id: inscripcionAnteriorId,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const [ins] = await queryInterface.sequelize.query(
    `SELECT id FROM inscripciones_mensuales
     WHERE cliente_email = :email AND clase_id = :claseId AND periodo_inicio = :inicio
     ORDER BY id DESC LIMIT 1`,
    { replacements: { email, claseId, inicio: periodoInicio } },
  );
  return ins[0].id;
};

const insertarReservasMensualDemo = async (
  queryInterface,
  { email, claseId, inscripcionId, fechas, estadoReserva, now },
) => {
  if (!fechas.length) return;
  await queryInterface.bulkInsert(
    "reservas_clase",
    fechas.map((fecha) => ({
      cliente_email: email,
      clase_id: claseId,
      fecha_exacta: fecha,
      asistio: null,
      estado: estadoReserva,
      inscripcion_mensual_id: inscripcionId,
      inscripcion_individual_id: null,
      createdAt: now,
      updatedAt: now,
    })),
  );
};

/** cliente2: julio VIGENTE + agosto PENDIENTE_PAGO precargado (Funcional). */
const sembrarMensualidadesAnticipadasDemo = async (queryInterface, now = new Date()) => {
  await queryInterface.sequelize.query(`
    INSERT INTO configuracion_sistema (id, dias_gracia_mensual, recordatorio_pago_dia, "createdAt", "updatedAt")
    VALUES (1, 1, 1, :now, :now)
    ON CONFLICT (id) DO UPDATE SET dias_gracia_mensual = 1, recordatorio_pago_dia = 1, "updatedAt" = :now
  `, { replacements: { now } }).catch(async () => {
    await queryInterface.bulkInsert("configuracion_sistema", [
      { id: 1, dias_gracia_mensual: 1, recordatorio_pago_dia: 1, createdAt: now, updatedAt: now },
    ]).catch(() => {});
  });

  const clase = await obtenerClasePorNombre(queryInterface, "Funcional — Miercoles 11:00");
  const actividad = await obtenerActividad(queryInterface, "Funcional");
  if (!clase || !actividad) return { creadas: 0 };

  const email = "cliente2@yopmail.com";
  await queryInterface.sequelize.query(
    `DELETE FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId`,
    { replacements: { email, claseId: clase.id } },
  );
  await queryInterface.sequelize.query(
    `DELETE FROM inscripciones_mensuales WHERE cliente_email = :email AND clase_id = :claseId`,
    { replacements: { email, claseId: clase.id } },
  );

  const periodoJulInicio = "2026-07-01";
  const periodoJulFin = finDeMesCalendario(periodoJulInicio);
  const periodoAgoInicio = sumarDiasIso(periodoJulFin, 1);
  const periodoAgoFin = finDeMesCalendario(periodoAgoInicio);
  const monto = Number(actividad.precio ?? 10000);

  const idJul = await insertarInscripcionMensualDemo(queryInterface, {
    email,
    claseId: clase.id,
    actividadId: actividad.id,
    periodoInicio: periodoJulInicio,
    periodoFin: periodoJulFin,
    estado: "VIGENTE",
    monto,
    now,
  });

  const fechasJul = fechasDiaEnPeriodoIso("Miercoles", periodoJulInicio, periodoJulFin);
  await insertarReservasMensualDemo(queryInterface, {
    email,
    claseId: clase.id,
    inscripcionId: idJul,
    fechas: fechasJul,
    estadoReserva: "ACTIVA",
    now,
  });

  const idAgo = await insertarInscripcionMensualDemo(queryInterface, {
    email,
    claseId: clase.id,
    actividadId: actividad.id,
    periodoInicio: periodoAgoInicio,
    periodoFin: periodoAgoFin,
    estado: "PENDIENTE_PAGO",
    monto,
    inscripcionAnteriorId: idJul,
    now,
  });

  const fechasAgo = fechasDiaEnPeriodoIso("Miercoles", periodoAgoInicio, periodoAgoFin);
  await insertarReservasMensualDemo(queryInterface, {
    email,
    claseId: clase.id,
    inscripcionId: idAgo,
    fechas: fechasAgo,
    estadoReserva: "PENDIENTE_PAGO",
    now,
  });

  return { julioId: idJul, agostoId: idAgo, fechasJul, fechasAgo };
};

const ACTIVIDADES_TESTING = ["Yoga", "Pilates", "Funcional"];

const USUARIOS_TESTING = {
  dueno: {
    email: "dueno@yopmail.com",
    dni: "10000001",
    nombre: "Dueño",
    apellido: "Principal",
    rol: "DUEÑO",
  },
  recepcion: {
    email: "recepcion@yopmail.com",
    dni: "10000002",
    nombre: "Recepcion",
    apellido: "Demo",
    rol: "RECEPCIONISTA",
  },
  clientes: [
    {
      email: "cliente1@yopmail.com",
      dni: "20000001",
      nombre: "Cliente",
      apellido: "Uno",
      genero: "masculino",
    },
    {
      email: "cliente2@yopmail.com",
      dni: "20000002",
      nombre: "Cliente",
      apellido: "Dos",
      genero: "femenino",
    },
    {
      email: "cliente3@yopmail.com",
      dni: "20000003",
      nombre: "Cliente",
      apellido: "Tres",
      genero: "masculino",
    },
  ],
};

/** Clase principal de demo: jueves 19:00, cupo 10 → lista de espera. */
const CLASE_LISTA_ESPERA = "Yoga — Jueves 19:00";
const CUPO_LISTA_ESPERA = 10;
/** Primer jueves de julio 2026 (reservas que llenan el cupo). */
const FECHA_DEMO_JUEVES = "2026-07-02";
const VALIDEZ_VALES_JULIO = { valido_desde: "2026-07-01", valido_hasta: "2026-07-31" };

/** Un vale INDIVIDUAL por actividad (atado a una clase representativa). */
const VALES_POR_ACTIVIDAD = [
  { actividad: "Yoga", clase: "Yoga — Jueves 19:00" },
  { actividad: "Pilates", clase: "Pilates — Martes 10:00" },
  { actividad: "Funcional", clase: "Funcional — Miercoles 11:00" },
];

const OCUPANTES_CUPO = Array.from({ length: CUPO_LISTA_ESPERA }, (_, i) => ({
  email: `ocupante${i + 1}@yopmail.com`,
  dni: String(30000001 + i),
  nombre: "Ocupante",
  apellido: `Demo ${i + 1}`,
  genero: i % 2 === 0 ? "masculino" : "femenino",
}));

const asegurarOcupantesCupo = async (queryInterface, now = new Date()) => {
  const rolId = await obtenerRolCliente(queryInterface);
  if (!rolId) return;
  const hash = await hashDemo();
  for (const o of OCUPANTES_CUPO) {
    await asegurarCliente(queryInterface, {
      email: o.email,
      dni: o.dni,
      nombre: o.nombre,
      apellido: o.apellido,
      rolId,
      hash,
      now,
      genero: o.genero,
    });
  }
};

const sembrarValesJulio = async (queryInterface, now = new Date()) => {
  let insertados = 0;
  for (const cliente of USUARIOS_TESTING.clientes) {
    for (const spec of VALES_POR_ACTIVIDAD) {
      const actividad = await obtenerActividad(queryInterface, spec.actividad);
      const clase = await obtenerClasePorNombre(queryInterface, spec.clase);
      if (!actividad || !clase) continue;

      const monto = precioIndividual(Number(actividad.precio ?? 10000));
      await upsertValeDemo(
        queryInterface,
        {
          cliente_email: cliente.email,
          clase_id: clase.id,
          tipo: "INDIVIDUAL",
          monto,
          valido_desde: VALIDEZ_VALES_JULIO.valido_desde,
          valido_hasta: VALIDEZ_VALES_JULIO.valido_hasta,
        },
        now,
      );
      insertados++;
    }
  }
  return insertados;
};

const sembrarClaseListaEsperaLlena = async (queryInterface, now = new Date()) => {
  const clase = await obtenerClasePorNombre(queryInterface, CLASE_LISTA_ESPERA);
  const actividad = await obtenerActividad(queryInterface, "Yoga");
  if (!clase || !actividad) {
    throw new Error(`Clase "${CLASE_LISTA_ESPERA}" o actividad Yoga no encontrada.`);
  }

  await limpiarDatosClase(queryInterface, clase.id);
  await asegurarOcupantesCupo(queryInterface, now);

  for (const o of OCUPANTES_CUPO) {
    await crearReservaIndividual(queryInterface, {
      email: o.email,
      claseId: clase.id,
      actividadId: actividad.id,
      fecha: FECHA_DEMO_JUEVES,
      precioActividad: actividad.precio,
      now,
    });
  }

  return { claseId: clase.id, fecha: FECHA_DEMO_JUEVES, cupo: CUPO_LISTA_ESPERA };
};

const sembrarEscenariosTesting = async (queryInterface, now = new Date()) => {
  const vales = await sembrarValesJulio(queryInterface, now);
  const listaEspera = await sembrarClaseListaEsperaLlena(queryInterface, now);
  return { vales, listaEspera };
};

/**
 * Pipeline único de demo manual:
 * - Reset operativo + solo 3 actividades
 * - Dueño, recepcionista y 3 clientes @yopmail.com
 * - 9 vales julio (3 actividades × 3 clientes)
 * - Una clase 10/10 para lista de espera
 */
const sembrarDemoFullManual = async (queryInterface) => {
  const now = new Date();
  await resetManualTesting(queryInterface);
  const escenarios = await sembrarEscenariosTesting(queryInterface, now);
  await asegurarConfiguracionGracia(queryInterface, now);
  return escenarios;
};

const limpiarDatosOperativos = async (queryInterface) => {
  await queryInterface.sequelize.query(`DELETE FROM asistencias`);
  await queryInterface.sequelize.query(
    `UPDATE vales SET usado_en_pago_id = NULL WHERE usado_en_pago_id IS NOT NULL`,
  );
  await queryInterface.sequelize.query(`DELETE FROM vales`);
  await queryInterface.sequelize.query(`DELETE FROM pagos`);
  await limpiarTodasLasReservas(queryInterface);
  await queryInterface.sequelize.query(`DELETE FROM cancelaciones_clase`).catch(() => {});
};

const asegurarConfiguracionGracia = async (queryInterface, now = new Date()) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM configuracion_sistema WHERE id = 1 LIMIT 1`,
  );
  if (rows.length > 0) {
    try {
      await queryInterface.sequelize.query(
        `UPDATE configuracion_sistema SET dias_gracia_mensual = 1, recordatorio_pago_dia = 1, "updatedAt" = :now WHERE id = 1`,
        { replacements: { now } },
      );
    } catch {
      await queryInterface.sequelize.query(
        `UPDATE configuracion_sistema SET dias_gracia_mensual = 1, "updatedAt" = :now WHERE id = 1`,
        { replacements: { now } },
      );
    }
    return;
  }
  try {
    await queryInterface.bulkInsert("configuracion_sistema", [
      { id: 1, dias_gracia_mensual: 1, recordatorio_pago_dia: 1, createdAt: now, updatedAt: now },
    ]);
  } catch {
    await queryInterface.bulkInsert("configuracion_sistema", [
      { id: 1, dias_gracia_mensual: 1, createdAt: now, updatedAt: now },
    ]).catch(() => {});
  }
};

const limpiarActividadesExtra = async (queryInterface) => {
  const [extras] = await queryInterface.sequelize.query(
    `SELECT id, nombre FROM actividades WHERE nombre NOT IN (:nombres)`,
    { replacements: { nombres: ACTIVIDADES_TESTING } },
  );

  for (const act of extras) {
    const [clases] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE actividad_id = :id`,
      { replacements: { id: act.id } },
    );
    for (const clase of clases) {
      await limpiarDatosClase(queryInterface, clase.id);
      await queryInterface.sequelize.query(`DELETE FROM clases WHERE id = :id`, {
        replacements: { id: clase.id },
      });
    }
    await queryInterface.sequelize.query(`DELETE FROM actividades WHERE id = :id`, {
      replacements: { id: act.id },
    });
  }

  if (extras.length > 0) {
    console.info(`[reset-manual-testing] ${extras.length} actividad(es) extra eliminada(s).`);
  }
};

const resetUsuariosTesting = async (queryInterface, now = new Date()) => {
  await queryInterface.sequelize.query(`DELETE FROM clientes`);
  await queryInterface.sequelize.query(`DELETE FROM usuarios`);

  const [roles] = await queryInterface.sequelize.query(`SELECT id, nombre FROM roles`);
  const rolPorNombre = Object.fromEntries(roles.map((r) => [r.nombre, r.id]));
  const hash = await hashDemo();

  const staff = [USUARIOS_TESTING.dueno, USUARIOS_TESTING.recepcion];
  await queryInterface.bulkInsert(
    "usuarios",
    staff.map((u) => ({
      email: u.email,
      dni: u.dni,
      nombre: u.nombre,
      apellido: u.apellido,
      password: hash,
      activo: true,
      rol_id: rolPorNombre[u.rol],
      createdAt: now,
      updatedAt: now,
    })),
  );

  const rolCliente = rolPorNombre.CLIENTE;
  for (const c of USUARIOS_TESTING.clientes) {
    await asegurarCliente(queryInterface, {
      email: c.email,
      dni: c.dni,
      nombre: c.nombre,
      apellido: c.apellido,
      rolId: rolCliente,
      hash,
      now,
      genero: c.genero,
    });
  }
};

/** Limpia datos operativos y deja solo 3 actividades + usuarios yopmail de testing. */
const resetManualTesting = async (queryInterface) => {
  await limpiarDatosOperativos(queryInterface);
  await limpiarActividadesExtra(queryInterface);
  await resetUsuariosTesting(queryInterface);
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
  sembrarMensualidadesAnticipadasDemo,
  ACTIVIDADES_TESTING,
  USUARIOS_TESTING,
  CLASE_LISTA_ESPERA,
  CUPO_LISTA_ESPERA,
  FECHA_DEMO_JUEVES,
  VALIDEZ_VALES_JULIO,
  VALES_POR_ACTIVIDAD,
  OCUPANTES_CUPO,
  resetManualTesting,
  sembrarEscenariosTesting,
  sembrarDemoFullManual,
  asegurarConfiguracionGracia,
};
