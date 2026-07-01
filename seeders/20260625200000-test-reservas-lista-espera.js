"use strict";

const {
  asegurarCliente,
  asegurarClientesRango,
  hashDemo,
  obtenerRolCliente,
  obtenerActividad,
  obtenerSala,
  obtenerProfesor,
  upsertClase,
  proximaFecha,
  limpiarDatosClase,
  crearReservaIndividual,
  eliminarClaseDemo,
  CUPO_MINIMO,
} = require("../lib/demo-helpers");

const NOMBRE_CLASE1 = "Test Clase Lunes";
const NOMBRE_CLASE2 = "Test Clase Miercoles";

const CLIENTE_A = "cliente1@test.com";
const CLIENTE_B = "cliente2@test.com";

/** Escenarios fijos para pruebas manuales de reservas y lista de espera. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rolClienteId = await obtenerRolCliente(queryInterface);
    if (!rolClienteId) {
      console.warn("[seeder test-reservas] No se encontró rol CLIENTE.");
      return;
    }

    const hash = await hashDemo();
    await asegurarClientesRango(queryInterface, 1, CUPO_MINIMO, now);

    const actFuncional = await obtenerActividad(queryInterface, "Funcional");
    const actYoga = await obtenerActividad(queryInterface, "Yoga");
    const salaId = await obtenerSala(queryInterface, "A-03");
    const profesorId = await obtenerProfesor(queryInterface, 0);

    if (!actFuncional || !actYoga || !salaId || !profesorId) {
      console.warn("[seeder test-reservas] Faltan dependencias base.");
      return;
    }

    const clase1Id = await upsertClase(
      queryInterface,
      {
        nombre: NOMBRE_CLASE1,
        dia_semana: "Lunes",
        hora_inicio: "09:00:00",
        hora_fin: "10:00:00",
        cupo: CUPO_MINIMO,
        actividad_id: actFuncional.id,
        sala_id: salaId,
        profesor_id: profesorId,
      },
      now,
    );

    const clase2Id = await upsertClase(
      queryInterface,
      {
        nombre: NOMBRE_CLASE2,
        dia_semana: "Miercoles",
        hora_inicio: "11:00:00",
        hora_fin: "12:00:00",
        cupo: CUPO_MINIMO,
        actividad_id: actYoga.id,
        sala_id: salaId,
        profesor_id: profesorId,
      },
      now,
    );

    await limpiarDatosClase(queryInterface, clase1Id);
    await limpiarDatosClase(queryInterface, clase2Id);

    const fechaClase2 = proximaFecha("Miercoles", now);
    const ocupantesClase2 = Array.from({ length: CUPO_MINIMO }, (_, i) => `cliente${i + 3}@test.com`);

    for (const email of ocupantesClase2) {
      const num = Number(email.match(/\d+/)?.[0] ?? 0);
      await asegurarCliente(queryInterface, {
        email,
        dni: String(66666660 + num),
        nombre: "Cliente",
        apellido: `Demo ${num}`,
        rolId: rolClienteId,
        hash,
        now,
      });
      await crearReservaIndividual(queryInterface, {
        email,
        claseId: clase2Id,
        actividadId: actYoga.id,
        fecha: fechaClase2,
        precioActividad: actYoga.precio,
        now,
      });
    }

    console.info("[seeder test-reservas] Configurado con éxito.");
    console.info(`  "${NOMBRE_CLASE1}" (Lunes 09:00) — cupo libre ${CUPO_MINIMO}.`);
    console.info(
      `  "${NOMBRE_CLASE2}" (Miércoles 11:00) — cupo ${CUPO_MINIMO}/${CUPO_MINIMO} el ${fechaClase2}.`,
    );
    console.info(`  Probá reservar con ${CLIENTE_A} o ${CLIENTE_B} y lista de espera en Miércoles.`);
  },

  async down(queryInterface) {
    await eliminarClaseDemo(queryInterface, NOMBRE_CLASE1);
    await eliminarClaseDemo(queryInterface, NOMBRE_CLASE2);
  },
};
