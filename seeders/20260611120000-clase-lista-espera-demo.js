"use strict";

const bcrypt = require("bcrypt");

const NOMBRE_CLASE_DEMO = "Demo Lista de Espera";
const CUPO = 10;
const HORA_INICIO = "18:00:00";
const HORA_FIN = "19:00:00";
const FICHA_MEDICA_DEMO = "data:application/pdf;base64,JVBERi0xLjQK";

/** Clientes que ocupan todos los cupos. Cualquier otro usuario puede probar la lista de espera. */
const CLIENTES_OCUPANTES = [
  "cliente1@test.com",
  "cliente2@test.com",
  "cliente3@test.com",
  "cliente4@test.com",
  "cliente5@test.com",
  "cliente6@test.com",
  "cliente7@test.com",
  "cliente8@test.com",
  "cliente9@test.com",
  "cliente10@test.com",
];

const pad2 = (n) => String(n).padStart(2, "0");

const asegurarClientesDemo = async (queryInterface, now) => {
  const [roles] = await queryInterface.sequelize.query(
    `SELECT id FROM roles WHERE nombre = 'CLIENTE' LIMIT 1`,
  );
  if (!roles[0]) {
    console.warn("[seeder lista-espera-demo] No se encontró el rol CLIENTE.");
    return;
  }
  const rolClienteId = roles[0].id;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("12345678", salt);

  for (let i = 3; i <= 10; i++) {
    const email = `cliente${i}@test.com`;
    const dni = String(66666660 + i);

    const [existente] = await queryInterface.sequelize.query(
      `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
      { replacements: { email } },
    );

    if (existente.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE usuarios SET password = :hash, "updatedAt" = :now WHERE email = :email`,
        { replacements: { hash, now, email } },
      );
      continue;
    }

    await queryInterface.bulkInsert("usuarios", [
      {
        email,
        dni,
        nombre: "Cliente",
        apellido: `Demo ${i}`,
        password: hash,
        activo: true,
        rol_id: rolClienteId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.bulkInsert("clientes", [
      {
        usuario_email: email,
        genero: i % 2 === 0 ? "femenino" : "masculino",
        fechaNacimiento: `199${i % 10}-0${(i % 9) + 1}-15`,
        fichaMedica: FICHA_MEDICA_DEMO,
        direccion: `Calle Demo ${i}, CABA`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }
};

/** Clase con cupo completo para probar lista de espera (reserva individual). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const hoy = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const diaHoy = dias[now.getDay()];

    if (diaHoy === "Domingo") {
      console.warn("[seeder lista-espera-demo] Hoy es domingo; no se crea la clase demo.");
      return;
    }

    await asegurarClientesDemo(queryInterface, now);

    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id FROM actividades WHERE nombre = 'Yoga' LIMIT 1`,
    );
    const [salas] = await queryInterface.sequelize.query(
      `SELECT id FROM salas WHERE "identificador" = 'A-02' LIMIT 1`,
    );
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id FROM profesores ORDER BY id ASC OFFSET 1 LIMIT 1`,
    );

    if (!actividades[0] || !salas[0] || !profesores[0]) {
      console.warn("[seeder lista-espera-demo] Faltan actividades, salas o profesores base.");
      return;
    }

    const actividadId = actividades[0].id;
    const salaId = salas[0].id;
    const profesorId = profesores[0].id;

    const [claseExistente] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE_DEMO } },
    );

    let claseId;
    if (claseExistente.length > 0) {
      claseId = claseExistente[0].id;
      await queryInterface.sequelize.query(
        `UPDATE clases SET
          dia_semana = :dia,
          hora_inicio = :inicio,
          hora_fin = :fin,
          cupo = :cupo,
          activa = true,
          "updatedAt" = :now
         WHERE id = :id`,
        {
          replacements: {
            id: claseId,
            dia: diaHoy,
            inicio: HORA_INICIO,
            fin: HORA_FIN,
            cupo: CUPO,
            now,
          },
        },
      );
    } else {
      await queryInterface.bulkInsert("clases", [
        {
          nombre: NOMBRE_CLASE_DEMO,
          dia_semana: diaHoy,
          hora_inicio: HORA_INICIO,
          hora_fin: HORA_FIN,
          cupo: CUPO,
          activa: true,
          actividad_id: actividadId,
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const [nueva] = await queryInterface.sequelize.query(
        `SELECT id FROM clases WHERE nombre = :nombre ORDER BY id DESC LIMIT 1`,
        { replacements: { nombre: NOMBRE_CLASE_DEMO } },
      );
      claseId = nueva[0].id;
    }

    const [precioRow] = await queryInterface.sequelize.query(
      `SELECT precio FROM actividades WHERE id = :id LIMIT 1`,
      { replacements: { id: actividadId } },
    );
    const precio = precioRow[0]?.precio ?? 25000;

    let reservasCreadas = 0;
    for (const email of CLIENTES_OCUPANTES) {
      const [cliente] = await queryInterface.sequelize.query(
        `SELECT "usuario_email" FROM clientes WHERE "usuario_email" = :email LIMIT 1`,
        { replacements: { email } },
      );
      if (cliente.length === 0) continue;

      await queryInterface.sequelize.query(
        `UPDATE clientes SET
          "fichaMedica" = COALESCE("fichaMedica", :ficha),
          "updatedAt" = :now
         WHERE "usuario_email" = :email`,
        { replacements: { email, ficha: FICHA_MEDICA_DEMO, now } },
      );

      const [reservaExistente] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase
         WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :hoy AND estado = 'ACTIVA'
         LIMIT 1`,
        { replacements: { email, claseId, hoy } },
      );
      if (reservaExistente.length > 0) {
        reservasCreadas++;
        continue;
      }

      await queryInterface.bulkInsert("inscripciones_individuales", [
        {
          cliente_email: email,
          actividad_id: actividadId,
          clase_id: claseId,
          fecha: hoy,
          modalidad: "COMPLETO",
          estado_seña: null,
          vencimiento_seña: null,
          monto_total: precio * 0.333,
          monto_pagado: precio * 0.333,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const [inscripcion] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_individuales
         WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :hoy
         ORDER BY id DESC LIMIT 1`,
        { replacements: { email, claseId, hoy } },
      );

      await queryInterface.bulkInsert("reservas_clase", [
        {
          cliente_email: email,
          clase_id: claseId,
          fecha_exacta: hoy,
          asistio: null,
          estado: "ACTIVA",
          inscripcion_mensual_id: null,
          inscripcion_individual_id: inscripcion[0].id,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      reservasCreadas++;
    }

    console.info(
      `[seeder lista-espera-demo] Clase "${NOMBRE_CLASE_DEMO}" (id ${claseId}) — ${hoy} (${diaHoy}) ${HORA_INICIO.slice(0, 5)}–${HORA_FIN.slice(0, 5)}, cupo ${CUPO}/${CUPO}.`,
    );
    console.info(
      `[seeder lista-espera-demo] ${reservasCreadas} reservas activas. Entrá con un usuario distinto (ej. enzobat07@gmail.com) y probá "Anotarse en lista de espera".`,
    );
  },

  async down(queryInterface) {
    const now = new Date();
    const hoy = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    const [clase] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE_DEMO } },
    );
    if (clase.length === 0) return;

    const claseId = clase[0].id;
    const emailsSql = CLIENTES_OCUPANTES.map((e) => `'${e}'`).join(",");

    await queryInterface.sequelize.query(
      `DELETE FROM lista_espera WHERE clase_id = :claseId`,
      { replacements: { claseId } },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase WHERE clase_id = :claseId AND fecha_exacta = :hoy AND cliente_email IN (${emailsSql})`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales WHERE clase_id = :claseId AND fecha = :hoy AND cliente_email IN (${emailsSql})`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.bulkDelete("clases", { nombre: NOMBRE_CLASE_DEMO }, {});

    const extras = CLIENTES_OCUPANTES.filter((e) => !["cliente1@test.com", "cliente2@test.com"].includes(e));
    await queryInterface.bulkDelete("clientes", { usuario_email: extras }, {});
    await queryInterface.bulkDelete("usuarios", { email: extras }, {});
  },
};
