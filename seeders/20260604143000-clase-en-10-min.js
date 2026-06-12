"use strict";

const NOMBRE_CLASE_DEMO = "Demo Clase 10 min";
const MINUTOS_HASTA_INICIO = 10;
const DURACION_CLASE_MIN = 60;
const CLIENTES_DEMO = ["cliente1@test.com", "enzobat07@gmail.com"];

const pad2 = (n) => String(n).padStart(2, "0");

const horaMasMinutos = (date, minutos) => {
  const total = date.getHours() * 60 + date.getMinutes() + minutos;
  const h = Math.floor(((total + 1440) % 1440) / 60);
  const m = (total + 1440) % 60;
  return `${pad2(h)}:${pad2(m)}:00`;
};

/** Clase + reserva para HOY, con horario ~10 min desde ahora (ventana QR: 30 min antes). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const hoy = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const diaHoy = dias[now.getDay()];
    const horaInicio = horaMasMinutos(now, MINUTOS_HASTA_INICIO);
    const horaFin = horaMasMinutos(now, MINUTOS_HASTA_INICIO + DURACION_CLASE_MIN);

    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id FROM actividades WHERE nombre = 'Funcional' LIMIT 1`,
    );
    const [salas] = await queryInterface.sequelize.query(
      `SELECT id FROM salas WHERE "identificador" = 'A-01' LIMIT 1`,
    );
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id FROM profesores ORDER BY id ASC LIMIT 1`,
    );

    if (!actividades[0] || !salas[0] || !profesores[0]) {
      console.warn("[seeder clase-en-10-min] Faltan actividades, salas o profesores base.");
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
          activa = true,
          "updatedAt" = :now
         WHERE id = :id`,
        {
          replacements: {
            id: claseId,
            dia: diaHoy,
            inicio: horaInicio,
            fin: horaFin,
            now,
          },
        },
      );
    } else {
      await queryInterface.bulkInsert("clases", [
        {
          nombre: NOMBRE_CLASE_DEMO,
          dia_semana: diaHoy,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          cupo: 10,
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
    const precio = precioRow[0]?.precio ?? 5000;

    for (const email of CLIENTES_DEMO) {
      const [cliente] = await queryInterface.sequelize.query(
        `SELECT "usuario_email" FROM clientes WHERE "usuario_email" = :email LIMIT 1`,
        { replacements: { email } },
      );
      if (cliente.length === 0) continue;

      await queryInterface.sequelize.query(
        `UPDATE clientes SET
          "fichaMedica" = COALESCE("fichaMedica", 'data:application/pdf;base64,JVBERi0xLjQK'),
          "updatedAt" = :now
         WHERE "usuario_email" = :email`,
        { replacements: { email, now } },
      );

      const [reservaExistente] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase
         WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :hoy AND estado = 'ACTIVA'
         LIMIT 1`,
        { replacements: { email, claseId, hoy } },
      );
      if (reservaExistente.length > 0) continue;

      await queryInterface.bulkInsert("inscripciones_individuales", [
        {
          cliente_email: email,
          actividad_id: actividadId,
          clase_id: claseId,
          fecha: hoy,
          modalidad: "COMPLETO",
          estado_seña: null,
          vencimiento_seña: null,
          monto_total: precio,
          monto_pagado: precio,
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
    }

    console.info(
      `[seeder clase-en-10-min] Clase "${NOMBRE_CLASE_DEMO}" (id ${claseId}) para ${hoy} (${diaHoy}) ${horaInicio.slice(0, 5)}–${horaFin.slice(0, 5)} (~${MINUTOS_HASTA_INICIO} min desde ahora).`,
    );
    console.info("[seeder clase-en-10-min] Reservas demo listas. Probá Generar QR con cliente1@test.com.");
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
    const emailsSql = CLIENTES_DEMO.map((e) => `'${e}'`).join(",");

    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase WHERE clase_id = :claseId AND fecha_exacta = :hoy AND cliente_email IN (${emailsSql})`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales WHERE clase_id = :claseId AND fecha = :hoy AND cliente_email IN (${emailsSql})`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.bulkDelete("clases", { nombre: NOMBRE_CLASE_DEMO }, {});
  },
};
