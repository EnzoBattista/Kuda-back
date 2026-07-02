"use strict";

const { sembrarMensualidadesAnticipadasDemo } = require("../lib/demo-helpers");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await sembrarMensualidadesAnticipadasDemo(queryInterface, now);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM reservas_clase WHERE cliente_email = 'cliente2@yopmail.com'`,
    );
    await queryInterface.sequelize.query(
      `DELETE FROM inscripciones_mensuales WHERE cliente_email = 'cliente2@yopmail.com'`,
    );
  },
};
