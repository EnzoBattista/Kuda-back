"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    
    // Buscar el ID del rol DUEÑO
    const [roles] = await queryInterface.sequelize.query(`SELECT id FROM roles WHERE nombre = 'DUEÑO' LIMIT 1`);
    if (roles.length === 0) {
      console.log("No se encontró el rol DUEÑO. Por favor corre los seeders de roles primero.");
      return;
    }
    const adminRoleId = roles[0].id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("12345678", salt);

    await queryInterface.bulkInsert("usuarios", [
      {
        email: "admin1@test.com",
        dni: "11111111",
        nombre: "Admin1",
        apellido: "Principal",
        password: hashedPassword,
        activo: true,
        rol_id: adminRoleId,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "admin2@test.com",
        dni: "11111112",
        nombre: "Admin2",
        apellido: "Secundario",
        password: hashedPassword,
        activo: true,
        rol_id: adminRoleId,
        createdAt: now,
        updatedAt: now,
      }
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("usuarios", { email: ["admin1@test.com", "admin2@test.com"] }, {});
  },
};
