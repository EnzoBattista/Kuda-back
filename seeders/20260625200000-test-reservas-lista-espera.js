"use strict";

const bcrypt = require("bcrypt");

const NOMBRE_CLASE1 = "Test Clase Lunes";
const NOMBRE_CLASE2 = "Test Clase Miercoles";
const FICHA_MEDICA_DEMO = "data:application/pdf;base64,JVBERi0xLjQK";

const CLIENTE_A = "cliente1@test.com";
const CLIENTE_B = "cliente2@test.com";
const CLIENTE_C = "cliente3@test.com";
const CLIENTE_D = "cliente4@test.com";

const pad2 = (n) => String(n).padStart(2, "0");

const fechaIso = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const proximaFecha = (diaSemanaObj, diaObjetivo) => {
  const hoy = new Date(diaSemanaObj);
  hoy.setHours(0, 0, 0, 0);
  const diff = (diaObjetivo - hoy.getDay() + 7) % 7;
  hoy.setDate(hoy.getDate() + diff);
  return fechaIso(hoy);
};

const asegurarCliente = async (queryInterface, { email, dni, nombre, apellido, rolId, hash, now }) => {
  const [existente] = await queryInterface.sequelize.query(
    `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
    { replacements: { email } }
  );
  if (existente.length > 0) return;

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
      genero: "masculino",
      fechaNacimiento: "1990-01-15",
      fichaMedica: FICHA_MEDICA_DEMO,
      direccion: "Calle Test 123, CABA",
      createdAt: now,
      updatedAt: now,
    },
  ]);
};

const asegurarFichaMedica = async (queryInterface, email, now) => {
  await queryInterface.sequelize.query(
    `UPDATE clientes SET "fichaMedica" = COALESCE("fichaMedica", :ficha), "updatedAt" = :now WHERE "usuario_email" = :email`,
    { replacements: { email, ficha: FICHA_MEDICA_DEMO, now } }
  );
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);

    // ── Dependencias base ───────────────────────────────────────────────────
    const [actFuncional] = await queryInterface.sequelize.query(
      `SELECT id, precio FROM actividades WHERE nombre = 'Funcional' LIMIT 1`
    );
    const [actYoga] = await queryInterface.sequelize.query(
      `SELECT id, precio FROM actividades WHERE nombre = 'Yoga' LIMIT 1`
    );
    const [salas] = await queryInterface.sequelize.query(
      `SELECT id FROM salas WHERE "identificador" = 'A-03' LIMIT 1`
    );
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id FROM profesores ORDER BY id ASC LIMIT 1`
    );
    const [rolCliente] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = 'CLIENTE' LIMIT 1`
    );

    if (!actFuncional[0] || !actYoga[0] || !salas[0] || !profesores[0] || !rolCliente[0]) {
      console.warn("[seeder test-reservas] Faltan dependencias base.");
      return;
    }

    const actividadFuncionalId = actFuncional[0].id;
    const actividadYogaId = actYoga[0].id;
    const precioYoga = parseFloat(actYoga[0].precio) || 25000;
    const salaId = salas[0].id;
    const profesorId = profesores[0].id;
    const rolClienteId = rolCliente[0].id;

    // ── Hash para clientes nuevos ───────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("12345678", salt);

    // Asegurar los clientes del test
    const clientes = [
      { email: CLIENTE_A, dni: "66666661", nombre: "Cliente", apellido: "Uno" },
      { email: CLIENTE_B, dni: "66666662", nombre: "Cliente", apellido: "Dos" },
      { email: CLIENTE_C, dni: "66666663", nombre: "Cliente", apellido: "Tres" },
      { email: CLIENTE_D, dni: "66666664", nombre: "Cliente", apellido: "Cuatro" },
    ];

    for (const c of clientes) {
      await asegurarCliente(queryInterface, {
        email: c.email,
        dni: c.dni,
        nombre: c.nombre,
        apellido: c.apellido,
        rolId: rolClienteId,
        hash,
        now,
      });
      await asegurarFichaMedica(queryInterface, c.email, now);
    }

    // CLASE 1 — Test Clase Lunes (cupo 10, sin reservas)
    let clase1Id;
    const [clase1Existente] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE1 } }
    );
    if (clase1Existente.length > 0) {
      clase1Id = clase1Existente[0].id;
    } else {
      await queryInterface.bulkInsert("clases", [
        {
          nombre: NOMBRE_CLASE1,
          dia_semana: "Lunes",
          hora_inicio: "09:00:00",
          hora_fin: "10:00:00",
          cupo: 10,
          activa: true,
          actividad_id: actividadFuncionalId,
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const [nueva1] = await queryInterface.sequelize.query(
        `SELECT id FROM clases WHERE nombre = :nombre ORDER BY id DESC LIMIT 1`,
        { replacements: { nombre: NOMBRE_CLASE1 } }
      );
      clase1Id = nueva1[0].id;
    }

    // CLASE 2 — Test Clase Miercoles (cupo 1, reservada por cliente3)
    let clase2Id;
    const [clase2Existente] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE2 } }
    );
    if (clase2Existente.length > 0) {
      clase2Id = clase2Existente[0].id;
      // Actualizar cupo a 1 para asegurar que sea de 1 persona
      await queryInterface.sequelize.query(
        `UPDATE clases SET cupo = 1 WHERE id = :id`,
        { replacements: { id: clase2Id } }
      );
    } else {
      await queryInterface.bulkInsert("clases", [
        {
          nombre: NOMBRE_CLASE2,
          dia_semana: "Miercoles",
          hora_inicio: "11:00:00",
          hora_fin: "12:00:00",
          cupo: 1,
          activa: true,
          actividad_id: actividadYogaId,
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const [nueva2] = await queryInterface.sequelize.query(
        `SELECT id FROM clases WHERE nombre = :nombre ORDER BY id DESC LIMIT 1`,
        { replacements: { nombre: NOMBRE_CLASE2 } }
      );
      clase2Id = nueva2[0].id;
    }

    // Limpiar reservas y listas de espera anteriores para estas clases de prueba
    await queryInterface.sequelize.query(
      `DELETE FROM lista_espera WHERE clase_id IN (:clase1Id, :clase2Id)`,
      { replacements: { clase1Id, clase2Id } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase WHERE clase_id IN (:clase1Id, :clase2Id)`,
      { replacements: { clase1Id, clase2Id } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales WHERE clase_id IN (:clase1Id, :clase2Id)`,
      { replacements: { clase1Id, clase2Id } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_mensuales WHERE clase_id IN (:clase1Id, :clase2Id)`,
      { replacements: { clase1Id, clase2Id } }
    );

    // Próxima fecha para Clase 2
    const fechaClase2 = proximaFecha(hoyDate, 3); // Próximo Miércoles (3=Mie)

    // Crear la única inscripción individual para CLIENTE_C (cliente3@test.com)
    await queryInterface.bulkInsert("inscripciones_individuales", [
      {
        cliente_email: CLIENTE_C,
        actividad_id: actividadYogaId,
        clase_id: clase2Id,
        fecha: fechaClase2,
        modalidad: "COMPLETO",
        estado_seña: null,
        vencimiento_seña: null,
        monto_total: precioYoga * 0.333,
        monto_pagado: precioYoga * 0.333,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const [insc] = await queryInterface.sequelize.query(
      `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha ORDER BY id DESC LIMIT 1`,
      { replacements: { email: CLIENTE_C, claseId: clase2Id, fecha: fechaClase2 } }
    );
    const inscId = insc[0].id;

    // Crear la única reserva ACTIVA para CLIENTE_C en Clase 2
    await queryInterface.bulkInsert("reservas_clase", [
      {
        cliente_email: CLIENTE_C,
        clase_id: clase2Id,
        fecha_exacta: fechaClase2,
        asistio: null,
        estado: "ACTIVA",
        inscripcion_mensual_id: null,
        inscripcion_individual_id: inscId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.info(`[seeder test-reservas] Seeder configurado con éxito.`);
    console.info(`  Clase 1: "${NOMBRE_CLASE1}" (Lunes) libre con cupo 10.`);
    console.info(`  Clase 2: "${NOMBRE_CLASE2}" (Miercoles) cupo 1/1 ocupado por ${CLIENTE_C} el ${fechaClase2}.`);
  },

  async down(queryInterface) {
    const [clase1] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE1 } }
    );
    const [clase2] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE2 } }
    );

    const claseIds = [...(clase1.map((c) => c.id)), ...(clase2.map((c) => c.id))];

    if (claseIds.length > 0) {
      const claseIdsSql = claseIds.join(",");
      await queryInterface.sequelize.query(`DELETE FROM lista_espera WHERE clase_id IN (${claseIdsSql})`);
      await queryInterface.sequelize.query(`DELETE FROM reservas_clase WHERE clase_id IN (${claseIdsSql})`);
      await queryInterface.sequelize.query(`DELETE FROM inscripciones_mensuales WHERE clase_id IN (${claseIdsSql})`);
      await queryInterface.sequelize.query(`DELETE FROM inscripciones_individuales WHERE clase_id IN (${claseIdsSql})`);
      await queryInterface.bulkDelete("clases", { nombre: [NOMBRE_CLASE1, NOMBRE_CLASE2] }, {});
    }

    const emailsExtraCreados = [CLIENTE_C, CLIENTE_D];
    for (const email of emailsExtraCreados) {
      const [otraActividad] = await queryInterface.sequelize.query(
        `(SELECT 1 FROM reservas_clase WHERE cliente_email = :email LIMIT 1) UNION ALL (SELECT 1 FROM inscripciones_mensuales WHERE cliente_email = :email LIMIT 1) UNION ALL (SELECT 1 FROM lista_espera WHERE cliente_email = :email LIMIT 1) UNION ALL (SELECT 1 FROM inscripciones_individuales WHERE cliente_email = :email LIMIT 1)`,
        { replacements: { email } }
      );
      if (otraActividad.length === 0) {
        await queryInterface.bulkDelete("clientes", { usuario_email: email }, {});
        await queryInterface.bulkDelete("usuarios", { email }, {});
      }
    }
  },
};
