"use strict";

const bcrypt = require("bcrypt");

const {
  obtenerActividad,
  upsertClase,
  obtenerSala,
  obtenerProfesor,
  fechaIso,
  sumarMeses,
} = require("../lib/demo-helpers");

const EMAIL = "clientesuspendido@test.com";
const PASSWORD = "12345678";
const CLASE_REFERENCIA = "Yoga — Jueves 17:00";

/** Cliente con mensualidad SUSPENDIDA en clase de horario fijo. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = 'CLIENTE' LIMIT 1`,
    );
    if (!roles[0]) {
      console.warn("[seeder cliente-suspendido] No se encontró el rol CLIENTE.");
      return;
    }

    const [existente] = await queryInterface.sequelize.query(
      `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
      { replacements: { email: EMAIL } },
    );

    if (existente.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(PASSWORD, salt);

      await queryInterface.bulkInsert("usuarios", [
        {
          email: EMAIL,
          dni: "88888888",
          nombre: "Pedro",
          apellido: "Suspendido",
          password: hash,
          activo: true,
          rol_id: roles[0].id,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      await queryInterface.bulkInsert("clientes", [
        {
          usuario_email: EMAIL,
          genero: "masculino",
          fechaNacimiento: "1990-03-20",
          fichaMedica: null,
          direccion: "Av. Demo 100, CABA",
          createdAt: now,
          updatedAt: now,
        },
      ]);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(PASSWORD, salt);
      await queryInterface.sequelize.query(
        `UPDATE usuarios SET password = :hash, "updatedAt" = :now WHERE email = :email`,
        { replacements: { hash, now, email: EMAIL } },
      );
    }

    const actividad = await obtenerActividad(queryInterface, "Yoga");
    const salaId = await obtenerSala(queryInterface, "A-01");
    const profesorId = await obtenerProfesor(queryInterface, 0);
    if (!actividad || !salaId || !profesorId) {
      console.warn("[seeder cliente-suspendido] Faltan dependencias base.");
      return;
    }

    const claseId = await upsertClase(
      queryInterface,
      {
        nombre: CLASE_REFERENCIA,
        dia_semana: "Jueves",
        hora_inicio: "17:00:00",
        hora_fin: "18:00:00",
        cupo: 15,
        actividad_id: actividad.id,
        sala_id: salaId,
        profesor_id: profesorId,
      },
      now,
    );

    const periodoFin = sumarMeses(now, -1);
    const periodoInicio = sumarMeses(periodoFin, -1);
    const periodoInicioIso = fechaIso(periodoInicio);
    const periodoFinIso = fechaIso(periodoFin);

    const [inscripcionExistente] = await queryInterface.sequelize.query(
      `SELECT id FROM inscripciones_mensuales
       WHERE cliente_email = :email AND clase_id = :claseId
       ORDER BY id DESC LIMIT 1`,
      { replacements: { email: EMAIL, claseId } },
    );

    if (inscripcionExistente.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE inscripciones_mensuales SET
          estado = 'SUSPENDIDA',
          periodo_inicio = :inicio,
          periodo_fin = :fin,
          dia_vencimiento = :fin,
          monto = :monto,
          "updatedAt" = :now
         WHERE id = :id`,
        {
          replacements: {
            id: inscripcionExistente[0].id,
            inicio: periodoInicioIso,
            fin: periodoFinIso,
            monto: actividad.precio,
            now,
          },
        },
      );
    } else {
      await queryInterface.bulkInsert("inscripciones_mensuales", [
        {
          cliente_email: EMAIL,
          actividad_id: actividad.id,
          clase_id: claseId,
          periodo_inicio: periodoInicioIso,
          periodo_fin: periodoFinIso,
          dia_vencimiento: periodoFinIso,
          estado: "SUSPENDIDA",
          monto: actividad.precio,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    console.info(
      `[seeder cliente-suspendido] ${EMAIL} / ${PASSWORD} — SUSPENDIDA en "${CLASE_REFERENCIA}" (id ${claseId}).`,
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("inscripciones_mensuales", { cliente_email: EMAIL }, {});
    await queryInterface.bulkDelete("clientes", { usuario_email: EMAIL }, {});
    await queryInterface.bulkDelete("usuarios", { email: EMAIL }, {});
  },
};
