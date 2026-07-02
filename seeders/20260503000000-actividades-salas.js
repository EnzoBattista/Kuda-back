"use strict";

const ACTIVIDADES = [
  {
    nombre: "Yoga",
    descripcion: "Disciplina enfocada en el equilibrio integral",
    precio: 10000,
  },
  {
    nombre: "Pilates",
    descripcion:
      "Método de entrenamiento que prioriza el control corporal, la alineación y el fortalecimiento",
    precio: 10000,
  },
  {
    nombre: "Funcional",
    descripcion: "Entrenamiento de movimientos funcionales y fuerza",
    precio: 10000,
  },
];

const SALAS = [
  { identificador: "A-01", cupo: 50 },
  { identificador: "A-02", cupo: 50 },
  { identificador: "A-03", cupo: 30 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const act of ACTIVIDADES) {
      const [existe] = await queryInterface.sequelize.query(
        `SELECT id FROM actividades WHERE nombre = :nombre LIMIT 1`,
        { replacements: { nombre: act.nombre } },
      );
      if (existe.length === 0) {
        await queryInterface.bulkInsert("actividades", [
          { ...act, createdAt: now, updatedAt: now },
        ]);
      } else {
        await queryInterface.sequelize.query(
          `UPDATE actividades SET precio = :precio, descripcion = :descripcion, "updatedAt" = :now WHERE nombre = :nombre`,
          {
            replacements: {
              nombre: act.nombre,
              precio: act.precio,
              descripcion: act.descripcion,
              now,
            },
          },
        );
      }
    }

    for (const sala of SALAS) {
      const [existe] = await queryInterface.sequelize.query(
        `SELECT id FROM salas WHERE "identificador" = :id LIMIT 1`,
        { replacements: { id: sala.identificador } },
      );
      if (existe.length === 0) {
        await queryInterface.bulkInsert("salas", [
          {
            identificador: sala.identificador,
            cupo: sala.cupo,
            estado_activo: true,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }

    console.info("[seeder actividades-salas] Catálogo base listo (idempotente).");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "salas",
      { identificador: SALAS.map((s) => s.identificador) },
      {},
    );
    await queryInterface.bulkDelete(
      "actividades",
      { nombre: ACTIVIDADES.map((a) => a.nombre) },
      {},
    );
  },
};
