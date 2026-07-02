"use strict";

/** Pagos demo idempotentes para listado y comprobantes (solo Mercado Pago). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const conceptos = [
      "Clase Yoga — Mercado Pago",
      "Mensualidad Pilates — Mercado Pago",
      "Clase Yoga — pago mostrador",
      "Mensualidad Pilates — transferencia",
    ];

    await queryInterface.bulkDelete("pagos", { concepto: conceptos }, {});

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
        recepcionista_email: null,
        origen: "CLASE_SUELTA",
        origen_id: null,
        concepto: conceptos[0],
        monto: 3330,
        fecha: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        metodo: "MERCADO_PAGO",
        estado: "COMPLETADO",
        createdAt: now,
        updatedAt: now,
      },
      {
        cliente_email: emails[1] ?? emails[0],
        recepcionista_email: null,
        origen: "MENSUALIDAD",
        origen_id: null,
        concepto: conceptos[1],
        monto: 10000,
        fecha: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        metodo: "MERCADO_PAGO",
        estado: "COMPLETADO",
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert("pagos", pagos);
    console.info("[seeder pagos-demo] 2 pagos demo insertados (idempotente).");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "pagos",
      {
        concepto: [
          "Clase Yoga — Mercado Pago",
          "Mensualidad Pilates — Mercado Pago",
          "Clase Yoga — pago mostrador",
          "Mensualidad Pilates — transferencia",
        ],
      },
      {},
    );
  },
};
