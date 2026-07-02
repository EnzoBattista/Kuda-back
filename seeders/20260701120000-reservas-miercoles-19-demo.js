"use strict";

const {
  obtenerClasePorNombre,
  crearReservaIndividual,
  proximaFecha,
  obtenerActividad,
} = require("../lib/demo-helpers");

const CLIENTES = ["cliente3@test.com", "cliente4@test.com"];

const buscarClaseMiercoles19 = async (queryInterface) => {
  const nombres = ["Funcional - Miercoles 19:00", "Funcional — Miercoles 19:00"];
  for (const nombre of nombres) {
    const clase = await obtenerClasePorNombre(queryInterface, nombre);
    if (clase) return clase;
  }

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, actividad_id FROM clases
     WHERE dia_semana = 'Miercoles'
       AND CAST(hora_inicio AS TEXT) LIKE '19:00%'
       AND activa = true
       AND "deletedAt" IS NULL
     ORDER BY id ASC
     LIMIT 1`,
  );
  return rows[0] ?? null;
};

/** Reserva individual activa de cliente3 y cliente4 para Funcional Miércoles 19:00. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const clase = await buscarClaseMiercoles19(queryInterface);

    if (!clase) {
      console.warn("[seeder reservas-miercoles-19] Clase Miércoles 19:00 no encontrada.");
      return;
    }

    const actividad = await obtenerActividad(queryInterface, "Funcional");
    const actividadId = clase.actividad_id ?? actividad?.id;
    if (!actividadId) {
      console.warn("[seeder reservas-miercoles-19] Actividad Funcional no encontrada.");
      return;
    }

    const fecha = proximaFecha("Miercoles", now);
    const precioActividad = Number(actividad?.precio ?? 10000);

    for (const email of CLIENTES) {
      await crearReservaIndividual(queryInterface, {
        email,
        claseId: clase.id,
        actividadId,
        fecha,
        precioActividad,
        estadoReserva: "ACTIVA",
        now,
      });
    }

    console.info(
      `[seeder reservas-miercoles-19] ${CLIENTES.join(", ")} → clase id ${clase.id} (${fecha}).`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_individuales
       WHERE cliente_email IN (:clientes)
         AND clase_id IN (
           SELECT id FROM clases
           WHERE dia_semana = 'Miercoles' AND CAST(hora_inicio AS TEXT) LIKE '19:00%'
         )`,
      { replacements: { clientes: CLIENTES } },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase
       WHERE cliente_email IN (:clientes)
         AND clase_id IN (
           SELECT id FROM clases
           WHERE dia_semana = 'Miercoles' AND CAST(hora_inicio AS TEXT) LIKE '19:00%'
         )`,
      { replacements: { clientes: CLIENTES } },
    );
  },
};
