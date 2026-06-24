"use strict";

/** Pagos demo para listado y comprobantes. */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [clientes] = await queryInterface.sequelize.query(
      `SELECT "usuario_email" FROM clientes WHERE "usuario_email" IN ('cliente1@test.com','cliente2@test.com')`,
    );

    if (clientes.length === 0) {
      console.warn("[seeder pagos-demo] No hay clientes demo. Ejecutá seeders de usuarios primero.");
      return;
    }

    const emails = clientes.map((c) => c.usuario_email);

    const pagos = [
      {
        cliente_email: emails[0],
        recepcionista_email: "recepcion1@test.com",
        origen: "CLASE_SUELTA",
        origen_id: 1,
        concepto: "Clase Yoga — pago mostrador",
        monto: 8500,
        fecha: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        metodo: "EFECTIVO",
        estado: "COMPLETADO",
        createdAt: now,
        updatedAt: now,
      },
      {
        cliente_email: emails[1] ?? emails[0],
        recepcionista_email: "recepcion1@test.com",
        origen: "MENSUALIDAD",
        origen_id: 1,
        concepto: "Mensualidad Pilates — transferencia",
        monto: 32000,
        fecha: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        metodo: "TRANSFERENCIA",
        estado: "COMPLETADO",
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert("pagos", pagos);
    console.info("[seeder pagos-demo] 2 pagos demo insertados.");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "pagos",
      {
        concepto: [
          "Clase Yoga — pago mostrador",
          "Mensualidad Pilates — transferencia",
        ],
      },
      {},
    );
  },
};
