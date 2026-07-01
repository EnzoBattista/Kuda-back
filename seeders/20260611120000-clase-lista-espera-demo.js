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
  eliminarClaseDemo,
  CUPO_MINIMO,
} = require("../lib/demo-helpers");

const NOMBRE_CLASE = "Demo Lista de Espera";
const DIA_SEMANA = "Viernes";
const HORA_INICIO = "18:00:00";
const HORA_FIN = "19:00:00";
const CUPO = CUPO_MINIMO;

const CLIENTES_OCUPANTES = Array.from({ length: CUPO }, (_, i) => `cliente${i + 1}@test.com`);

/** Viernes 18:00–19:00, cupo lleno → probar lista de espera individual. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const fechaClase = proximaFecha(DIA_SEMANA, now);

    await asegurarClientesRango(queryInterface, 1, CUPO, now);

    const actividad = await obtenerActividad(queryInterface, "Yoga");
    const salaId = await obtenerSala(queryInterface, "A-02");
    const profesorId = await obtenerProfesor(queryInterface, 1);
    if (!actividad || !salaId || !profesorId) {
      console.warn("[seeder lista-espera-demo] Faltan actividades, salas o profesores base.");
      return;
    }

    const claseId = await upsertClase(
      queryInterface,
      {
        nombre: NOMBRE_CLASE,
        dia_semana: DIA_SEMANA,
        hora_inicio: HORA_INICIO,
        hora_fin: HORA_FIN,
        cupo: CUPO,
        actividad_id: actividad.id,
        sala_id: salaId,
        profesor_id: profesorId,
      },
      now,
    );

    await limpiarDatosClase(queryInterface, claseId);

    let reservasCreadas = 0;
    for (const email of CLIENTES_OCUPANTES) {
      await crearReservaIndividual(queryInterface, {
        email,
        claseId,
        actividadId: actividad.id,
        fecha: fechaClase,
        precioActividad: actividad.precio,
        now,
      });
      reservasCreadas++;
    }

    console.info(
      `[seeder lista-espera-demo] "${NOMBRE_CLASE}" id ${claseId} — ${fechaClase} ${HORA_INICIO.slice(0, 5)}–${HORA_FIN.slice(0, 5)}, cupo ${CUPO}/${CUPO}.`,
    );
    console.info(
      `[seeder lista-espera-demo] ${reservasCreadas} reservas. Probá lista de espera con otro usuario (ej. admin o cliente extra).`,
    );
  },

  async down(queryInterface) {
    await eliminarClaseDemo(queryInterface, NOMBRE_CLASE);
  },
};
