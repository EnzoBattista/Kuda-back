"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [actividades] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM actividades`
    );
    const [salas] = await queryInterface.sequelize.query(
      `SELECT id, "identificador" FROM salas`
    );
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id, dni FROM profesores WHERE dni IN ('22222222','33333333','44444444')`
    );

    const actPorNombre = Object.fromEntries(actividades.map((a) => [a.nombre, a.id]));
    const salaPorId = Object.fromEntries(salas.map((s) => [s.identificador, s.id]));
    const profPorDni = Object.fromEntries(profesores.map((p) => [p.dni, p.id]));

    await queryInterface.bulkInsert("clases", [
      {
        nombre: "Yoga Mañana",
        dia_semana: "Lunes",
        hora_inicio: "08:00:00",
        hora_fin: "09:00:00",
        cupo: 20,
        activa: true,
        actividad_id: actPorNombre["Yoga"],
        sala_id: salaPorId["A-01"],
        profesor_id: profPorDni["22222222"],
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Yoga Tarde",
        dia_semana: "Miercoles",
        hora_inicio: "18:00:00",
        hora_fin: "19:00:00",
        cupo: 20,
        activa: true,
        actividad_id: actPorNombre["Yoga"],
        sala_id: salaPorId["A-02"],
        profesor_id: profPorDni["33333333"],
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Pilates Mañana",
        dia_semana: "Martes",
        hora_inicio: "09:00:00",
        hora_fin: "10:00:00",
        cupo: 15,
        activa: true,
        actividad_id: actPorNombre["Pilates"],
        sala_id: salaPorId["A-03"],
        profesor_id: profPorDni["33333333"],
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Pilates Noche",
        dia_semana: "Jueves",
        hora_inicio: "20:00:00",
        hora_fin: "21:00:00",
        cupo: 15,
        activa: true,
        actividad_id: actPorNombre["Pilates"],
        sala_id: salaPorId["A-03"],
        profesor_id: profPorDni["33333333"],
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Funcional Mañana",
        dia_semana: "Lunes",
        hora_inicio: "07:00:00",
        hora_fin: "08:00:00",
        cupo: 25,
        activa: true,
        actividad_id: actPorNombre["Funcional"],
        sala_id: salaPorId["A-01"],
        profesor_id: profPorDni["44444444"],
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: "Funcional Tarde",
        dia_semana: "Viernes",
        hora_inicio: "17:00:00",
        hora_fin: "18:00:00",
        cupo: 25,
        activa: true,
        actividad_id: actPorNombre["Funcional"],
        sala_id: salaPorId["A-02"],
        profesor_id: profPorDni["22222222"],
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "clases",
      {
        nombre: [
          "Yoga Mañana",
          "Yoga Tarde",
          "Pilates Mañana",
          "Pilates Noche",
          "Funcional Mañana",
          "Funcional Tarde",
        ],
      },
      {}
    );
  },
};
