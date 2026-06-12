"use strict";

const bcrypt = require("bcrypt");

/** Contraseña unificada para todos los usuarios demo del proyecto. */
const DEMO_PASSWORD = "12345678";

const DEMO_EMAILS = [
  "cliente1@test.com",
  "cliente2@test.com",
  "cliente3@test.com",
  "cliente4@test.com",
  "cliente5@test.com",
  "cliente6@test.com",
  "cliente7@test.com",
  "cliente8@test.com",
  "cliente9@test.com",
  "cliente10@test.com",
  "clientesuspendido@test.com",
  "recepcion1@test.com",
  "recepcion2@test.com",
  "admin1@test.com",
  "admin2@test.com",
];

/** Normaliza la contraseña de usuarios demo existentes (idempotente). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(DEMO_PASSWORD, salt);

    const [existentes] = await queryInterface.sequelize.query(
      `SELECT email FROM usuarios WHERE email IN (:emails)`,
      { replacements: { emails: DEMO_EMAILS } },
    );

    if (existentes.length === 0) {
      console.warn("[seeder reset-demo-passwords] No hay usuarios demo en la base.");
      return;
    }

    await queryInterface.sequelize.query(
      `UPDATE usuarios SET password = :hash, "updatedAt" = :now WHERE email IN (:emails)`,
      {
        replacements: {
          hash,
          now,
          emails: existentes.map((r) => r.email),
        },
      },
    );

    console.info(
      `[seeder reset-demo-passwords] ${existentes.length} usuario(s) demo → contraseña "${DEMO_PASSWORD}".`,
    );
    existentes.forEach((r) => console.info(`  - ${r.email}`));
  },

  async down() {
    /* no reversible */
  },
};
