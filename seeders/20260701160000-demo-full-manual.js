"use strict";

const {
  DEMO_PASSWORD,
  ACTIVIDADES_TESTING,
  USUARIOS_TESTING,
  CLASE_LISTA_ESPERA,
  CUPO_LISTA_ESPERA,
  VALIDEZ_VALES_JULIO,
  VALES_POR_ACTIVIDAD,
  sembrarDemoFullManual,
} = require("../lib/demo-helpers");

/**
 * Seeder consolidado para `npm run seed:demo-full`.
 * Deja el entorno listo para testing manual con datos mínimos y repetibles.
 */
module.exports = {
  async up(queryInterface) {
    const { vales, listaEspera } = await sembrarDemoFullManual(queryInterface);

    console.info("");
    console.info("══════════════════════════════════════════════════════");
    console.info("  DEMO FULL — entorno de testing manual");
    console.info("══════════════════════════════════════════════════════");
    console.info(`  Actividades:     ${ACTIVIDADES_TESTING.join(", ")}`);
    console.info(`  Contraseña:      ${DEMO_PASSWORD} (todos los usuarios)`);
    console.info("");
    console.info("  Usuarios de prueba (@yopmail.com):");
    console.info(`    Dueño:         ${USUARIOS_TESTING.dueno.email}`);
    console.info(`    Recepción:     ${USUARIOS_TESTING.recepcion.email}`);
    for (const c of USUARIOS_TESTING.clientes) {
      console.info(`    Cliente:       ${c.email}`);
    }
    console.info("");
    console.info(`  Vales:           ${vales} (${USUARIOS_TESTING.clientes.length} clientes × ${VALES_POR_ACTIVIDAD.length} actividades)`);
    console.info(`  Vigencia vales:  ${VALIDEZ_VALES_JULIO.valido_desde} → ${VALIDEZ_VALES_JULIO.valido_hasta}`);
    console.info("");
    console.info(`  Lista de espera: "${CLASE_LISTA_ESPERA}"`);
    console.info(`    Fecha llena:   ${listaEspera.fecha} (${listaEspera.cupo}/${listaEspera.cupo})`);
    console.info(`    Credencial para cancelar/probar: ocupante10@yopmail.com / ${DEMO_PASSWORD}`);
    console.info("");
    console.info("  Doc: docs/SEED-MANUAL-TESTING.md");
    console.info("══════════════════════════════════════════════════════");
  },

  async down() {
    /* no reversible */
  },
};
