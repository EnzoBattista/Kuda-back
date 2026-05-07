"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM actividades WHERE nombre IN ('Yoga', 'Pilates', 'Funcional')`
    );

    const idDe = (nombre) => actividades.find((a) => a.nombre === nombre)?.id;

    const planes = [];
    const filas = [
      { nombre: "Mensual Yoga", actividad: "Yoga", tipo: "MENSUAL", precio: 25000 },
      { nombre: "Mensual Pilates", actividad: "Pilates", tipo: "MENSUAL", precio: 28000 },
      { nombre: "Mensual Funcional", actividad: "Funcional", tipo: "MENSUAL", precio: 30000 },
      { nombre: "Individual Yoga", actividad: "Yoga", tipo: "INDIVIDUAL", precio: 8000 },
      { nombre: "Individual Pilates", actividad: "Pilates", tipo: "INDIVIDUAL", precio: 9000 },
      { nombre: "Individual Funcional", actividad: "Funcional", tipo: "INDIVIDUAL", precio: 9500 },
    ];

    for (const f of filas) {
      const actividad_id = idDe(f.actividad);
      if (!actividad_id) continue;
      planes.push({
        nombre: f.nombre,
        actividad_id,
        tipo: f.tipo,
        precio: f.precio,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (planes.length > 0) {
      await queryInterface.bulkInsert("planes", planes);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "planes",
      {
        nombre: [
          "Mensual Yoga",
          "Mensual Pilates",
          "Mensual Funcional",
          "Individual Yoga",
          "Individual Pilates",
          "Individual Funcional",
        ],
      },
      {}
    );
  },
};
