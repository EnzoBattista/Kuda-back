"use strict";

const {
  obtenerActividad,
  obtenerSala,
  obtenerProfesor,
  upsertClase,
  eliminarClasesDomingo,
  archivarClasesFueraDeCatalogo,
} = require("../lib/demo-helpers");

/**
 * Catálogo de clases: solo Yoga, Funcional y Pilates.
 * Inicio en punto entre 07:00 y 21:00. Sin domingos.
 */
const CLASES_BASE = [
  { nombre: "Yoga — Lunes 09:00", actividad: "Yoga", dia: "Lunes", inicio: "09:00:00", fin: "10:00:00", cupo: 15, sala: "A-01", prof: 0 },
  { nombre: "Pilates — Martes 10:00", actividad: "Pilates", dia: "Martes", inicio: "10:00:00", fin: "11:00:00", cupo: 12, sala: "A-02", prof: 1 },
  { nombre: "Funcional — Miercoles 11:00", actividad: "Funcional", dia: "Miercoles", inicio: "11:00:00", fin: "12:00:00", cupo: 15, sala: "A-03", prof: 2 },
  { nombre: "Yoga — Jueves 17:00", actividad: "Yoga", dia: "Jueves", inicio: "17:00:00", fin: "18:00:00", cupo: 20, sala: "A-01", prof: 0 },
  { nombre: "Yoga — Jueves 19:00", actividad: "Yoga", dia: "Jueves", inicio: "19:00:00", fin: "20:00:00", cupo: 10, sala: "A-01", prof: 0 },
  { nombre: "Yoga — Jueves 20:00", actividad: "Yoga", dia: "Jueves", inicio: "20:00:00", fin: "21:00:00", cupo: 10, sala: "A-01", prof: 0 },
  { nombre: "Pilates — Viernes 08:00", actividad: "Pilates", dia: "Viernes", inicio: "08:00:00", fin: "09:00:00", cupo: 12, sala: "A-02", prof: 1 },
  { nombre: "Funcional — Martes 18:00", actividad: "Funcional", dia: "Martes", inicio: "18:00:00", fin: "19:00:00", cupo: 14, sala: "A-03", prof: 2 },
  { nombre: "Pilates — Jueves 09:00", actividad: "Pilates", dia: "Jueves", inicio: "09:00:00", fin: "10:00:00", cupo: 12, sala: "A-02", prof: 1 },
  { nombre: "Funcional — Sabado 20:00", actividad: "Funcional", dia: "Sabado", inicio: "20:00:00", fin: "21:00:00", cupo: 18, sala: "A-03", prof: 2 },
  { nombre: "Yoga — Viernes 19:00", actividad: "Yoga", dia: "Viernes", inicio: "19:00:00", fin: "20:00:00", cupo: 10, sala: "A-01", prof: 0 },
  { nombre: "Pilates — Miercoles 07:00", actividad: "Pilates", dia: "Miercoles", inicio: "07:00:00", fin: "08:00:00", cupo: 10, sala: "A-02", prof: 1 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await eliminarClasesDomingo(queryInterface);

    let creadas = 0;

    for (const c of CLASES_BASE) {
      const actividad = await obtenerActividad(queryInterface, c.actividad);
      const salaId = await obtenerSala(queryInterface, c.sala);
      const profesorId = await obtenerProfesor(queryInterface, c.prof);
      if (!actividad || !salaId || !profesorId) {
        console.warn(`[seeder clases] Omitida "${c.nombre}": faltan dependencias.`);
        continue;
      }

      await upsertClase(
        queryInterface,
        {
          nombre: c.nombre,
          dia_semana: c.dia,
          hora_inicio: c.inicio,
          hora_fin: c.fin,
          cupo: c.cupo,
          actividad_id: actividad.id,
          sala_id: salaId,
          profesor_id: profesorId,
        },
        now,
      );
      creadas++;
    }

    await archivarClasesFueraDeCatalogo(
      queryInterface,
      CLASES_BASE.map((c) => c.nombre),
      now,
    );

    console.info(`[seeder clases] ${creadas} clase(s) en catálogo (horarios en punto, sin domingo).`);
  },

  async down(queryInterface) {
    const nombres = CLASES_BASE.map((c) => c.nombre);
    await queryInterface.bulkDelete("clases", { nombre: nombres }, {});
  },
};
