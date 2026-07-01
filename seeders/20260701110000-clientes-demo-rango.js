"use strict";

const { asegurarClientesRango } = require("../lib/demo-helpers");

/** Clientes demo cliente3@test.com … cliente20@test.com (idempotente). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const creados = await asegurarClientesRango(queryInterface, 3, 20, now);
    console.info(
      `[seeder clientes-demo-rango] cliente3–20 listos (${creados} nuevo(s), resto actualizado).`,
    );
  },

  async down(queryInterface) {
    const emails = Array.from({ length: 18 }, (_, i) => `cliente${i + 3}@test.com`);
    await queryInterface.bulkDelete("clientes", { usuario_email: emails }, {});
    await queryInterface.bulkDelete("usuarios", { email: emails }, {});
  },
};
