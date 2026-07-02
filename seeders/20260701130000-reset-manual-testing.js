"use strict";

const {
  DEMO_PASSWORD,
  ACTIVIDADES_TESTING,
  USUARIOS_TESTING,
  resetManualTesting,
} = require("../lib/demo-helpers");

/** Reset para testing manual: 3 actividades, dueño, recepcionista y 3 clientes @yopmail.com. */
module.exports = {
  async up(queryInterface) {
    await resetManualTesting(queryInterface);

    console.info("[seeder reset-manual-testing] Base lista para testing manual.");
    console.info(`  Actividades: ${ACTIVIDADES_TESTING.join(", ")}`);
    console.info(`  Dueño:         ${USUARIOS_TESTING.dueno.email} / ${DEMO_PASSWORD}`);
    console.info(`  Recepción:     ${USUARIOS_TESTING.recepcion.email} / ${DEMO_PASSWORD}`);
    for (const c of USUARIOS_TESTING.clientes) {
      console.info(`  Cliente:       ${c.email} / ${DEMO_PASSWORD}`);
    }
  },

  async down() {
    /* no reversible */
  },
};
