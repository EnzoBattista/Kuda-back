"use strict";

const {
  DEMO_PASSWORD,
  ACTIVIDADES_TESTING,
  USUARIOS_TESTING,
  CLASE_LISTA_ESPERA,
  CUPO_LISTA_ESPERA,
  FECHA_DEMO_JUEVES,
  VALIDEZ_VALES_JULIO,
  VALES_POR_ACTIVIDAD,
  sembrarEscenariosTesting,
} = require("../lib/demo-helpers");

/** Vales julio + clase Yoga Jueves 19:00 con cupo 10/10 para lista de espera. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const { vales, listaEspera } = await sembrarEscenariosTesting(queryInterface, now);

    console.info("[seeder demo-testing-escenarios] Escenarios listos.");
    console.info(`  Vales: ${vales} (${USUARIOS_TESTING.clientes.length} clientes × ${VALES_POR_ACTIVIDAD.length} actividades)`);
    console.info(`  Vigencia vales: ${VALIDEZ_VALES_JULIO.valido_desde} → ${VALIDEZ_VALES_JULIO.valido_hasta}`);
    console.info(
      `  Lista de espera: "${CLASE_LISTA_ESPERA}" — ${listaEspera.fecha} — cupo ${listaEspera.cupo}/${listaEspera.cupo}`,
    );
    console.info(`  Ocupantes del cupo: ocupante1@yopmail.com … ocupante${CUPO_LISTA_ESPERA}@yopmail.com / ${DEMO_PASSWORD}`);
  },

  async down() {
    /* no reversible */
  },
};
