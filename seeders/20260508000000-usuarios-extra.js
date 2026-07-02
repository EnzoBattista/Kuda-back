"use strict";

const { asegurarCliente, hashDemo, obtenerRolCliente, FICHA_MEDICA_DEMO } = require("../lib/demo-helpers");

/** Recepcionistas + clientes demo 1 y 2 (idempotente). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM roles WHERE nombre IN ('RECEPCIONISTA','CLIENTE')`,
    );
    const rolPorNombre = Object.fromEntries(roles.map((r) => [r.nombre, r.id]));
    const hash = await hashDemo();
    const rolCliente = rolPorNombre["CLIENTE"];

    const staff = [
      {
        email: "recepcion1@test.com",
        dni: "55555551",
        nombre: "Recepcionista",
        apellido: "Uno",
        rol_id: rolPorNombre["RECEPCIONISTA"],
      },
      {
        email: "recepcion2@test.com",
        dni: "55555552",
        nombre: "Recepcionista",
        apellido: "Dos",
        rol_id: rolPorNombre["RECEPCIONISTA"],
      },
    ];

    for (const u of staff) {
      const [prev] = await queryInterface.sequelize.query(
        `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
        { replacements: { email: u.email } },
      );
      if (prev.length === 0) {
        await queryInterface.bulkInsert("usuarios", [
          { ...u, password: hash, activo: true, createdAt: now, updatedAt: now },
        ]);
      } else {
        await queryInterface.sequelize.query(
          `UPDATE usuarios SET password = :hash, "updatedAt" = :now WHERE email = :email`,
          { replacements: { hash, now, email: u.email } },
        );
      }
    }

    const clientes = [
      { email: "cliente1@test.com", dni: "66666661", apellido: "Uno", genero: "masculino" },
      { email: "cliente2@test.com", dni: "77777772", apellido: "Dos", genero: "femenino" },
    ];

    for (const c of clientes) {
      await asegurarCliente(queryInterface, {
        email: c.email,
        dni: c.dni,
        nombre: "Cliente",
        apellido: c.apellido,
        rolId: rolCliente,
        hash,
        now,
        genero: c.genero,
      });
      await queryInterface.sequelize.query(
        `UPDATE clientes SET
          "fechaNacimiento" = :nac,
          direccion = :dir,
          "fichaMedica" = COALESCE("fichaMedica", :ficha),
          "updatedAt" = :now
         WHERE "usuario_email" = :email`,
        {
          replacements: {
            email: c.email,
            nac: c.email === "cliente1@test.com" ? "1995-04-12" : "1998-08-23",
            dir:
              c.email === "cliente1@test.com"
                ? "Av. Corrientes 1234, CABA"
                : "Calle Florida 567, CABA",
            ficha: FICHA_MEDICA_DEMO,
            now,
          },
        },
      );
    }

    console.info("[seeder usuarios-extra] Recepcionistas y cliente1–2 listos (idempotente).");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "clientes",
      { usuario_email: ["cliente1@test.com", "cliente2@test.com"] },
      {},
    );
    await queryInterface.bulkDelete(
      "usuarios",
      { email: ["recepcion1@test.com", "recepcion2@test.com", "cliente1@test.com", "cliente2@test.com"] },
      {},
    );
  },
};
