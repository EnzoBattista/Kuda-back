"use strict";

const { limpiarTodasLasReservas } = require("../lib/demo-helpers");

/** Limpia reservas, inscripciones y lista de espera (demo sin ocupación). */
module.exports = {
  async up(queryInterface) {
    await limpiarTodasLasReservas(queryInterface);
    console.info("[seeder reset-operativo] Sin reservas ni inscripciones operativas.");
  },

  async down() {
    /* no reversible */
  },
};
