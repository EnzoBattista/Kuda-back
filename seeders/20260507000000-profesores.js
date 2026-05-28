"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("profesores", [
      {
        nombre: "Carlos",
        apellido: "Mendoza",
        dni: "22222222",
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Laura",
        apellido: "Fernández",
        dni: "33333333",
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Martín",
        apellido: "García",
        dni: "44444444",
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id, dni FROM profesores WHERE dni IN ('22222222','33333333','44444444')`
    );
    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM actividades`
    );

    const profPorDni = Object.fromEntries(profesores.map((p) => [p.dni, p.id]));
    const actPorNombre = Object.fromEntries(actividades.map((a) => [a.nombre, a.id]));

    // Carlos enseña Yoga y Funcional, Laura enseña Pilates y Yoga, Martín enseña Funcional
    const asignaciones = [
      { dni: "22222222", actividad: "Yoga" },
      { dni: "22222222", actividad: "Funcional" },
      { dni: "33333333", actividad: "Pilates" },
      { dni: "33333333", actividad: "Yoga" },
      { dni: "44444444", actividad: "Funcional" },
    ];

    const filas = asignaciones
      .filter(({ dni, actividad }) => profPorDni[dni] && actPorNombre[actividad])
      .map(({ dni, actividad }) => ({
        profesor_id: profPorDni[dni],
        actividad_id: actPorNombre[actividad],
        createdAt: now,
        updatedAt: now,
      }));

    if (filas.length > 0) {
      await queryInterface.bulkInsert("profesor_actividad", filas);
    }
  },

  async down(queryInterface) {
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id FROM profesores WHERE dni IN ('22222222','33333333','44444444')`
    );
    const ids = profesores.map((p) => p.id);

    if (ids.length > 0) {
      await queryInterface.bulkDelete("profesor_actividad", { profesor_id: ids }, {});
    }
    await queryInterface.bulkDelete(
      "profesores",
      { dni: ["22222222", "33333333", "44444444"] },
      {}
    );
  },
};
