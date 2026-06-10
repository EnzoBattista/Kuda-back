"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM roles WHERE nombre IN ('RECEPCIONISTA','CLIENTE')`
    );
    const rolPorNombre = Object.fromEntries(roles.map((r) => [r.nombre, r.id]));

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("12345678", salt);

    await queryInterface.bulkInsert("usuarios", [
      {
        email: "recepcion1@test.com",
        dni: "55555551",
        nombre: "Recepcionista",
        apellido: "Uno",
        password: hash,
        activo: true,
        rol_id: rolPorNombre["RECEPCIONISTA"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "recepcion2@test.com",
        dni: "55555552",
        nombre: "Recepcionista",
        apellido: "Dos",
        password: hash,
        activo: true,
        rol_id: rolPorNombre["RECEPCIONISTA"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente1@test.com",
        dni: "66666661",
        nombre: "Cliente",
        apellido: "Uno",
        password: hash,
        activo: true,
        rol_id: rolPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente2@test.com",
        dni: "77777772",
        nombre: "Cliente",
        apellido: "Dos",
        password: hash,
        activo: true,
        rol_id: rolPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      }
    ]);

    await queryInterface.bulkInsert("clientes", [
      {
        usuario_email: "cliente1@test.com",
        genero: "masculino",
        fechaNacimiento: "1995-04-12",
        fichaMedica: null,
        direccion: "Av. Corrientes 1234, CABA",
        createdAt: now,
        updatedAt: now,
      },
      {
        usuario_email: "cliente2@test.com",
        genero: "femenino",
        fechaNacimiento: "1998-08-23",
        fichaMedica: null,
        direccion: "Calle Florida 567, CABA",
        createdAt: now,
        updatedAt: now,
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "clientes",
      { usuario_email: ["cliente1@test.com", "cliente2@test.com"] },
      {}
    );
    await queryInterface.bulkDelete(
      "usuarios",
      { email: ["recepcion1@test.com", "recepcion2@test.com", "cliente1@test.com", "cliente2@test.com"] },
      {}
    );
  },
};
