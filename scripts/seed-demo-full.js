#!/usr/bin/env node

"use strict";



/**

 * Ejecuta todos los seeders demo en orden. Los seeders son idempotentes

 * (upsert / skip si ya existen) salvo usuarios base en instalación nueva.

 * Sin reservas ni ocupación: catálogo limpio para probar flujos desde cero.

 */

require("dotenv").config();

const path = require("path");

const { conn } = require("../db");



/** Orden explícito: reset operativo antes de suspendido/vales. */

const SEEDERS = [

  "20260505000000-roles-permisos.js",

  "20260503000000-actividades-salas.js",

  "20260506000000-usuarios.js",

  "20260507000000-profesores.js",

  "20260508000000-usuarios-extra.js",

  "20260509000000-clases.js",

  "20260510000000-recepcionista-clase-gestionar.js",

  "20260701100000-reset-operativo-demo.js",

  "20260701110000-clientes-demo-rango.js",

  "20260701120000-reservas-miercoles-19-demo.js",

  "20260603000000-pagos-demo.js",

  "20260627120000-vales-demo.js",

  "20260611180000-cliente-suspendido-demo.js",

  "20260611190000-reset-demo-passwords.js",

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

        fail++;

      }

    }

  }



  console.log(`\nListo: ${ok} seeders, ${fail} con error.`);

  await conn.close();

  process.exit(fail > 0 ? 1 : 0);

})();

