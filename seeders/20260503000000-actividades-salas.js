"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("actividades", [
      {
        nombre: "Yoga",
        descripcion: "Disciplina enfocada en el equilibrio integral",
        precio: 25000,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Pilates",
        descripcion:
          "Método de entrenamiento que prioriza el control corporal, la alineación y el fortalecimiento",
        precio: 28000,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Funcional",
        descripcion: "Entrenamiento de movimientos funcionales y fuerza",
        precio: 30000,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.bulkInsert("salas", [
      {
        identificador: "A-01",
        cupo: 50,
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        identificador: "A-02",
        cupo: 50,
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        identificador: "A-03",
        cupo: 30,
        estado_activo: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "salas",
      { identificador: ["A-01", "A-02", "A-03"] },
      {}
    );

    await queryInterface.bulkDelete(
      "actividades",
      { nombre: ["Yoga", "Pilates", "Funcional"] },
      {}
    );
  },
};
