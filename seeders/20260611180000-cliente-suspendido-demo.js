"use strict";

const bcrypt = require("bcrypt");

const EMAIL = "clientesuspendido@test.com";
const PASSWORD = "12345678";

const pad2 = (n) => String(n).padStart(2, "0");

const fechaIso = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const sumarMeses = (date, meses) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + meses);
  return d;
};

/** Cliente con mensualidad SUSPENDIDA (falta de pago) para probar QR y otros flujos. */
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

    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id, precio FROM actividades WHERE nombre = 'Yoga' LIMIT 1`,
    );
    const [clases] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE activa = true AND "deletedAt" IS NULL ORDER BY id DESC LIMIT 1`,
    );

    if (!actividades[0] || !clases[0]) {
      console.warn("[seeder cliente-suspendido] Faltan actividades o clases activas.");
      return;
    }

    const actividadId = actividades[0].id;
    const claseId = clases[0].id;
    const precio = actividades[0].precio ?? 25000;

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
            monto: precio,
            now,
          },
        },
      );
    } else {
      await queryInterface.bulkInsert("inscripciones_mensuales", [
        {
          cliente_email: EMAIL,
          actividad_id: actividadId,
          clase_id: claseId,
          periodo_inicio: periodoInicioIso,
          periodo_fin: periodoFinIso,
          dia_vencimiento: periodoFinIso,
          estado: "SUSPENDIDA",
          monto: precio,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    console.info(
      `[seeder cliente-suspendido] Usuario ${EMAIL} / ${PASSWORD} — mensualidad SUSPENDIDA (clase id ${claseId}).`,
    );
    console.info(
      "[seeder cliente-suspendido] Probá Generar QR: debe informar suspensión por falta de pago.",
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "inscripciones_mensuales",
      { cliente_email: EMAIL },
      {},
    );
    await queryInterface.bulkDelete("clientes", { usuario_email: EMAIL }, {});
    await queryInterface.bulkDelete("usuarios", { email: EMAIL }, {});
  },
};
