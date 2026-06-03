"use strict";

/** Datos demo para probar QR y asistencias: reservas para el día de ejecución del seeder. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hoy = `${yyyy}-${mm}-${dd}`;

    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const diaHoy = dias[now.getDay()];

    await queryInterface.sequelize.query(`
      UPDATE clientes SET
        "fichaMedica" = 'data:application/pdf;base64,JVBERi0xLjQK',
        "foto_perfil" = 'https://i.pravatar.cc/256?u=cliente1@test.com',
        "updatedAt" = :now
      WHERE "usuario_email" = 'cliente1@test.com'
    `, { replacements: { now } });

    await queryInterface.sequelize.query(`
      UPDATE clientes SET
        "fichaMedica" = 'data:application/pdf;base64,JVBERi0xLjQK',
        "foto_perfil" = 'https://i.pravatar.cc/256?u=cliente2@test.com',
        "updatedAt" = :now
      WHERE "usuario_email" = 'cliente2@test.com'
    `, { replacements: { now } });

    const [clasesHoy] = await queryInterface.sequelize.query(
      `SELECT c.id, c.nombre, c.actividad_id
       FROM clases c
       WHERE c.dia_semana = :dia AND c.activa = true
       ORDER BY c.hora_inicio ASC
       LIMIT 1`,
      { replacements: { dia: diaHoy } },
    );

    if (clasesHoy.length === 0) {
      console.warn("[seeder asistencias-demo] No hay clases para", diaHoy, "- omitiendo reservas demo.");
      return;
    }

    const clase = clasesHoy[0];

    const clientesDemo = ["cliente1@test.com", "cliente2@test.com"];

    for (const email of clientesDemo) {
      const [existente] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase
         WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :hoy AND estado = 'ACTIVA'
         LIMIT 1`,
        { replacements: { email, claseId: clase.id, hoy } },
      );

      if (existente.length > 0) continue;

      const [actividadRow] = await queryInterface.sequelize.query(
        `SELECT precio FROM actividades WHERE id = :id LIMIT 1`,
        { replacements: { id: clase.actividad_id } },
      );
      const precio = actividadRow[0]?.precio ?? 5000;

      await queryInterface.bulkInsert("inscripciones_individuales", [
        {
          cliente_email: email,
          actividad_id: clase.actividad_id,
          clase_id: clase.id,
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
        { replacements: { email, claseId: clase.id, hoy } },
      );

      await queryInterface.bulkInsert("reservas_clase", [
        {
          cliente_email: email,
          clase_id: clase.id,
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
      `[seeder asistencias-demo] Reservas demo creadas para ${hoy} (${diaHoy}) en clase "${clase.nombre}" (id ${clase.id}).`,
    );
  },

  async down(queryInterface) {
    const now = new Date();
    const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    await queryInterface.sequelize.query(
      `DELETE FROM asistencias WHERE fecha = :hoy`,
      { replacements: { hoy } },
    );

    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase
       WHERE cliente_email IN ('cliente1@test.com','cliente2@test.com')
         AND fecha_exacta = :hoy`,
      { replacements: { hoy } },
    );

    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales
       WHERE cliente_email IN ('cliente1@test.com','cliente2@test.com')
         AND fecha = :hoy`,
      { replacements: { hoy } },
    );
  },
};
