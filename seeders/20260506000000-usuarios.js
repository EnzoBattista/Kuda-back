"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    
    // Buscar el ID del rol ADMIN
    const [roles] = await queryInterface.sequelize.query(`SELECT id FROM roles WHERE nombre = 'ADMIN' LIMIT 1`);
    if (roles.length === 0) {
      console.log("No se encontró el rol ADMIN. Por favor corre los seeders de roles primero.");
      return;
    }
    const adminRoleId = roles[0].id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    await queryInterface.bulkInsert("usuarios", [
      {
        email: "admin@test.com",
        dni: "11111111",
        nombre: "Admin",
        apellido: "Principal",
        password: hashedPassword,
        activo: true,
        rol_id: adminRoleId,
        createdAt: now,
        updatedAt: now,
      }
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("usuarios", { email: "admin@test.com" }, {});
  },
};
