"use strict";

const {
  obtenerActividad,
  obtenerClasePorNombre,
  upsertValeDemo,
  precioIndividual,
  rangoValidezVale,
  fechaIso,
  sumarDias,
} = require("../lib/demo-helpers");

/**
 * Vales demo para probar descuentos en reservas y pestaña "Vales" del cliente.
 * Idempotente: upsert por cliente + clase + tipo + monto.
 */
const VALES_DEMO = [
  {
    cliente: "cliente1@test.com",
    clase: "Yoga — Lunes 09:00",
    tipo: "INDIVIDUAL",
    montoKey: "yoga_individual",
  },
  {
    cliente: "cliente1@test.com",
    clase: "Yoga — Lunes 09:00",
    tipo: "MENSUAL",
    montoKey: "yoga_mensual_20",
  },
  {
    cliente: "cliente2@test.com",
    clase: "Yoga — Lunes 09:00",
    tipo: "MENSUAL",
    montoKey: "yoga_mensual_completo",
  },
  {
    cliente: "cliente2@test.com",
    clase: "Funcional — Martes 18:00",
    tipo: "INDIVIDUAL",
    montoKey: "funcional_individual_50",
  },
  {
    cliente: "cliente2@test.com",
    clase: "Pilates — Martes 10:00",
    tipo: "INDIVIDUAL",
    montoKey: "pilates_parcial",
  },
  {
    cliente: "cliente3@test.com",
    clase: "Pilates — Viernes 08:00",
    tipo: "MENSUAL",
    montoKey: "pilates_mensual_20",
  },
  {
    cliente: "cliente4@test.com",
    clase: "Yoga — Jueves 17:00",
    tipo: "INDIVIDUAL",
    montoKey: "yoga_parcial",
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const vigente = rangoValidezVale(now);
    let insertados = 0;

    const montos = async () => {
      const yoga = await obtenerActividad(queryInterface, "Yoga");
      const pilates = await obtenerActividad(queryInterface, "Pilates");
      const funcional = await obtenerActividad(queryInterface, "Funcional");
      const yogaInd = precioIndividual(yoga?.precio ?? 10000);
      const pilatesInd = precioIndividual(pilates?.precio ?? 10000);
      const funcionalInd = precioIndividual(funcional?.precio ?? 10000);

      return {
        yoga_individual: yogaInd,
        yoga_mensual_20: Number((Number(yoga?.precio ?? 10000) * 0.2).toFixed(2)),
        yoga_mensual_completo: 10000,
        funcional_individual_50: Number((funcionalInd / 2).toFixed(2)),
        pilates_parcial: Number((pilatesInd * 0.35).toFixed(2)),
        pilates_mensual_20: Number((Number(pilates?.precio ?? 10000) * 0.2).toFixed(2)),
        yoga_parcial: Number((yogaInd * 0.4).toFixed(2)),
      };
    };

    const tablaMontos = await montos();

    for (const v of VALES_DEMO) {
      const clase = await obtenerClasePorNombre(queryInterface, v.clase);
      if (!clase) {
        console.warn(`[seeder vales-demo] Omitido: clase "${v.clase}" no encontrada.`);
        continue;
      }

      const monto = tablaMontos[v.montoKey];
      if (!monto || monto <= 0) continue;

      await upsertValeDemo(
        queryInterface,
        {
          cliente_email: v.cliente,
          clase_id: clase.id,
          tipo: v.tipo,
          monto,
          ...vigente,
        },
        now,
      );
      insertados++;
    }

    // Vale vencido (no aparece en listado vigente).
    const claseFuncional = await obtenerClasePorNombre(queryInterface, "Funcional — Miercoles 11:00");
    if (claseFuncional) {
      const funcional = await obtenerActividad(queryInterface, "Funcional");
      const montoVencido = Number((precioIndividual(funcional?.precio ?? 10000) * 0.25).toFixed(2));
      await upsertValeDemo(
        queryInterface,
        {
          cliente_email: "cliente2@test.com",
          clase_id: claseFuncional.id,
          tipo: "INDIVIDUAL",
          monto: montoVencido,
          valido_desde: fechaIso(sumarDias(now, -90)),
          valido_hasta: fechaIso(sumarDias(now, -10)),
        },
        now,
      );
    }

    // Vale ya usado (no aparece en listado).
    const claseYoga = await obtenerClasePorNombre(queryInterface, "Yoga — Lunes 09:00");
    if (claseYoga) {
      await upsertValeDemo(
        queryInterface,
        {
          cliente_email: "cliente1@test.com",
          clase_id: claseYoga.id,
          tipo: "INDIVIDUAL",
          monto: 1500,
          ...vigente,
          usado_en_pago_id: 1,
        },
        now,
      );
    }

    console.info(
      `[seeder vales-demo] ${insertados} vales vigentes para clientes demo (cliente1–4).`,
    );
    console.info(
      "[seeder vales-demo] Probá con cliente1@test.com → pestaña Vales o reservar Yoga con cupón.",
    );
  },

  async down(queryInterface) {
    const emails = [
      "cliente1@test.com",
      "cliente2@test.com",
      "cliente3@test.com",
      "cliente4@test.com",
    ];
    await queryInterface.sequelize.query(
      `DELETE FROM vales WHERE cliente_email IN (:emails)`,
      { replacements: { emails } },
    );
  },
};
