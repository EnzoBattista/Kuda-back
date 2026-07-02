#!/usr/bin/env node

"use strict";

/**
 * Pipeline de testing manual (guardar y reutilizar):
 *
 *   npm run seed:demo-full
 *
 * Deja:
 *   - 3 actividades: Yoga, Pilates, Funcional
 *   - 1 dueño, 1 recepcionista, 3 clientes @yopmail.com
 *   - 9 vales INDIVIDUAL (1 por actividad × cliente), vigencia julio 2026
 *   - Yoga — Jueves 19:00 con cupo 10/10 el 2026-07-02 → lista de espera
 *   - Catálogo base: roles, salas, profesores, clases
 *
 * Ver docs/SEED-MANUAL-TESTING.md
 */

require("dotenv").config();

const path = require("path");
const { conn } = require("../db");

const SEEDERS = [
  "20260505000000-roles-permisos.js",
  "20260503000000-actividades-salas.js",
  "20260507000000-profesores.js",
  "20260509000000-clases.js",
  "20260510000000-recepcionista-clase-gestionar.js",
  "20260701160000-demo-full-manual.js",
];

(async () => {
  const queryInterface = conn.getQueryInterface();
  let ok = 0;
  let fail = 0;

  for (const file of SEEDERS) {
    const full = path.join(__dirname, "..", "seeders", file);
    const seeder = require(full);
    process.stdout.write(`→ ${file} ... `);

    try {
      await seeder.up(queryInterface);
      console.log("OK");
      ok++;
    } catch (err) {
      const dup = /duplicada|duplicate|already exists/i.test(String(err.message));
      if (dup) {
        console.log("SKIP (ya existía)");
        ok++;
      } else {
        console.log("ERROR");
        console.error(`   ${err.message}`);
        if (err.stack) console.error(err.stack.split("\n").slice(1, 4).join("\n"));
        fail++;
      }
    }
  }

  console.log(`\nListo: ${ok} seeders, ${fail} con error.`);
  console.log("Ver docs/SEED-MANUAL-TESTING.md para credenciales y escenarios.");
  await conn.close();
  process.exit(fail > 0 ? 1 : 0);
})();
