"use strict";

const {
  asegurarClientesRango,
  obtenerActividad,
  obtenerSala,
  obtenerProfesor,
  upsertClase,
  proximaFecha,
  limpiarDatosClase,
  crearReservaIndividual,
  crearInscripcionMensual,
  eliminarClaseDemo,
  eliminarClasesDomingo,
  CUPO_MINIMO,
} = require("../lib/demo-helpers");

/**
 * Escenarios demo masivos con horarios FIJOS.
 * Cada bloque es idempotente (upsert + limpieza previa).
 */
const ESCENARIOS = [
  {
    nombre: "Demo Cupo Parcial — Martes 14:00",
    actividad: "Pilates",
    dia: "Martes",
    inicio: "14:00:00",
    fin: "15:00:00",
    cupo: 12,
    sala: "A-02",
    prof: 1,
    ocupantes: 7,
    desdeCliente: 1,
  },
  {
    nombre: "Demo Sin Cupo — Jueves 19:00",
    actividad: "Funcional",
    dia: "Jueves",
    inicio: "19:00:00",
    fin: "20:00:00",
    cupo: CUPO_MINIMO,
    sala: "A-03",
    prof: 2,
    ocupantes: CUPO_MINIMO,
    desdeCliente: 1,
  },
  {
    nombre: "Demo Libre — Sabado 11:00",
    actividad: "Yoga",
    dia: "Sabado",
    inicio: "11:00:00",
    fin: "12:00:00",
    cupo: 15,
    sala: "A-01",
    prof: 0,
    ocupantes: 0,
    desdeCliente: 1,
  },
  {
    nombre: "Demo Conflicto A — Lunes 17:00",
    actividad: "Yoga",
    dia: "Lunes",
    inicio: "17:00:00",
    fin: "18:00:00",
    cupo: CUPO_MINIMO,
    sala: "A-01",
    prof: 0,
    ocupantes: 0,
    desdeCliente: 1,
  },
  {
    nombre: "Demo Conflicto B — Lunes 17:30",
    actividad: "Pilates",
    dia: "Lunes",
    inicio: "17:30:00",
    fin: "18:30:00",
    cupo: CUPO_MINIMO,
    sala: "A-02",
    prof: 1,
    ocupantes: 0,
    desdeCliente: 1,
  },
  {
    nombre: "Demo Seña — Miercoles 16:00",
    actividad: "Funcional",
    dia: "Miercoles",
    inicio: "16:00:00",
    fin: "17:00:00",
    cupo: 14,
    sala: "A-03",
    prof: 2,
    ocupantes: 3,
    desdeCliente: 1,
  },
  {
    nombre: "Demo Mensual — Viernes 12:00",
    actividad: "Pilates",
    dia: "Viernes",
    inicio: "12:00:00",
    fin: "13:00:00",
    cupo: 12,
    sala: "A-02",
    prof: 1,
    ocupantes: 0,
    mensualCliente: "cliente1@test.com",
    desdeCliente: 1,
  },
  {
    nombre: "Demo Alta Ocupación — Sabado 18:00",
    actividad: "Funcional",
    dia: "Sabado",
    inicio: "18:00:00",
    fin: "19:00:00",
    cupo: 20,
    sala: "A-03",
    prof: 2,
    ocupantes: 18,
    desdeCliente: 1,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await eliminarClasesDomingo(queryInterface);
    await eliminarClaseDemo(queryInterface, "Demo Alta Ocupación — Domingo 18:00");
    await asegurarClientesRango(queryInterface, 1, 20, now);

    let totalClases = 0;
    let totalReservas = 0;

    for (const esc of ESCENARIOS) {
      const actividad = await obtenerActividad(queryInterface, esc.actividad);
      const salaId = await obtenerSala(queryInterface, esc.sala);
      const profesorId = await obtenerProfesor(queryInterface, esc.prof);
      if (!actividad || !salaId || !profesorId) {
        console.warn(`[seeder escenarios] Omitido "${esc.nombre}": sin dependencias.`);
        continue;
      }

      const claseId = await upsertClase(
        queryInterface,
        {
          nombre: esc.nombre,
          dia_semana: esc.dia,
          hora_inicio: esc.inicio,
          hora_fin: esc.fin,
          cupo: esc.cupo,
          actividad_id: actividad.id,
          sala_id: salaId,
          profesor_id: profesorId,
        },
        now,
      );
      totalClases++;

      await limpiarDatosClase(queryInterface, claseId);
      const fecha = proximaFecha(esc.dia, now);

      if (esc.mensualCliente) {
        await crearInscripcionMensual(queryInterface, {
          email: esc.mensualCliente,
          claseId,
          actividadId: actividad.id,
          precioActividad: actividad.precio,
          estado: "VIGENTE",
          now,
        });
      }

      const ocupantes = Math.min(esc.ocupantes, esc.cupo);
      for (let i = 0; i < ocupantes; i++) {
        const num = esc.desdeCliente + i;
        const email = `cliente${num}@test.com`;
        await crearReservaIndividual(queryInterface, {
          email,
          claseId,
          actividadId: actividad.id,
          fecha,
          precioActividad: actividad.precio,
          now,
        });
        totalReservas++;
      }

      console.info(
        `[seeder escenarios] ${esc.nombre} → ${fecha} ${esc.inicio.slice(0, 5)} (${ocupantes}/${esc.cupo} reservas)`,
      );
    }

    console.info(
      `[seeder escenarios] Listo: ${totalClases} clases demo, ${totalReservas} reservas individuales.`,
    );
  },

  async down(queryInterface) {
    for (const esc of ESCENARIOS) {
      await eliminarClaseDemo(queryInterface, esc.nombre);
    }
    await eliminarClaseDemo(queryInterface, "Demo Alta Ocupación — Domingo 18:00");
  },
};
