"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("planes", [
      {
        nombre: "Pase Libre",
        precio: 28999.0,
        duracion_dias: 30,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Plan Trimestral",
        precio: 74999.0,
        duracion_dias: 90,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Plan Anual",
        precio: 249999.0,
        duracion_dias: 365,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.bulkInsert("socios", [
      {
        nombre: "Juan Perez",
        email: "juan.perez@gym.local",
        telefono: "+54 11 4000-0001",
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Maria Gomez",
        email: "maria.gomez@gym.local",
        telefono: "+54 11 4000-0002",
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Lucia Fernandez",
        email: "lucia.fernandez@gym.local",
        telefono: "+54 11 4000-0003",
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Carlos Diaz",
        email: "carlos.diaz@gym.local",
        telefono: "+54 11 4000-0004",
        estado_activo: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Sofia Martinez",
        email: "sofia.martinez@gym.local",
        telefono: "+54 11 4000-0005",
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "socios",
      {
        email: [
          "juan.perez@gym.local",
          "maria.gomez@gym.local",
          "lucia.fernandez@gym.local",
          "carlos.diaz@gym.local",
          "sofia.martinez@gym.local",
        ],
      },
      {}
    );

    await queryInterface.bulkDelete(
      "planes",
      {
        nombre: ["Pase Libre", "Plan Trimestral", "Plan Anual"],
      },
      {}
    );
  },
};
