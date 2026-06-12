"use strict";

const NOMBRE_CLASE_DEMO = "Demo Ventana 30 min";
/** Inicio ~20 min → ventana QR (30 min antes) ya abierta ~10 min. */
const MINUTOS_HASTA_INICIO = 20;
const DURACION_CLASE_MIN = 60;
const MINUTOS_VENTANA_QR = 30;

const pad2 = (n) => String(n).padStart(2, "0");

const horaMasMinutos = (date, minutos) => {
  const total = date.getHours() * 60 + date.getMinutes() + minutos;
  const h = Math.floor(((total + 1440) % 1440) / 60);
  const m = (total + 1440) % 60;
  return `${pad2(h)}:${pad2(m)}:00`;
};

/** Clase HOY en ventana QR (30 min antes del inicio hasta el fin), cupo libre para reservar. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const hoy = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const diaHoy = dias[now.getDay()];

    if (diaHoy === "Domingo") {
      console.warn("[seeder ventana-30min] Hoy es domingo; no se crea la clase demo.");
      return;
    }

    const horaInicio = horaMasMinutos(now, MINUTOS_HASTA_INICIO);
    const horaFin = horaMasMinutos(now, MINUTOS_HASTA_INICIO + DURACION_CLASE_MIN);
    const ventanaDesde = horaMasMinutos(now, MINUTOS_HASTA_INICIO - MINUTOS_VENTANA_QR);

    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id FROM actividades WHERE nombre = 'Funcional' LIMIT 1`,
    );
    const [salas] = await queryInterface.sequelize.query(
      `SELECT id FROM salas WHERE "identificador" = 'A-02' LIMIT 1`,
    );
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id FROM profesores ORDER BY id ASC OFFSET 1 LIMIT 1`,
    );

    if (!actividades[0] || !salas[0] || !profesores[0]) {
      console.warn("[seeder ventana-30min] Faltan actividades, salas o profesores base.");
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
          cupo = 10,
          activa = true,
          actividad_id = :actividadId,
          sala_id = :salaId,
          profesor_id = :profesorId,
          "updatedAt" = :now
         WHERE id = :id`,
        {
          replacements: {
            id: claseId,
            dia: diaHoy,
            inicio: horaInicio,
            fin: horaFin,
            actividadId,
            salaId,
            profesorId,
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

    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase WHERE clase_id = :claseId AND fecha_exacta = :hoy`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales WHERE clase_id = :claseId AND fecha = :hoy`,
      { replacements: { claseId, hoy } },
    );

    console.info(
      `[seeder ventana-30min] Clase "${NOMBRE_CLASE_DEMO}" (id ${claseId}) — ${hoy} (${diaHoy})`,
    );
    console.info(
      `  Horario: ${horaInicio.slice(0, 5)}–${horaFin.slice(0, 5)} | Ventana QR: ${ventanaDesde.slice(0, 5)}–${horaFin.slice(0, 5)} | Cupo libre.`,
    );
    console.info(
      "[seeder ventana-30min] Clases → reservá → Generar QR. Re-ejecutá el seeder si pasó la hora.",
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
    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase WHERE clase_id = :claseId AND fecha_exacta = :hoy`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales WHERE clase_id = :claseId AND fecha = :hoy`,
      { replacements: { claseId, hoy } },
    );
    await queryInterface.bulkDelete("clases", { nombre: NOMBRE_CLASE_DEMO }, {});
  },
};
