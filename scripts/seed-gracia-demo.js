#!/usr/bin/env node

"use strict";

/**
 * Escenario de prueba: mensualidad en período de gracia.
 *
 *   node scripts/seed-gracia-demo.js
 *
 * Deja, para cliente2@yopmail.com en "Pilates - Viernes 09:00":
 *   - Una mensualidad de JUNIO 2026 ya FINALIZADA (con sus clases cumplidas).
 *   - La mensualidad de JULIO 2026 precargada en EN_GRACIA, generada con la
 *     función real del sistema (por lo que tiene sus reservas PENDIENTE_PAGO).
 *
 * Además demuestra el congelado de días de gracia:
 *   1. Configura días de gracia = 8 y genera la mensualidad (snapshotea 8).
 *   2. Baja la config a 1.
 *   3. La mensualidad de julio conserva sus 8 días → sigue en gracia hoy
 *      (2026-07-02, fin de gracia 2026-07-08). Si usara la config viva (1),
 *      el fin de gracia sería 2026-07-01 y ya estaría suspendida.
 *
 * En "Mis reservas" de cliente2 debe aparecer la mensualidad de julio con el
 * botón para completar el pago.
 *
 * Requiere haber corrido antes el seed principal (npm run seed:all).
 */

require("dotenv").config();

const {
  conn,
  InscripcionMensual,
  ReservaClase,
  Clase,
  Actividad,
} = require("../db");
const {
  crearProximaMensualidadPendiente,
} = require("../src/services/clases/inscripcionesMensuales.service");
const {
  actualizarConfiguracion,
} = require("../src/services/sistema/configuracion.service");

const CLIENTE = "cliente2@yopmail.com";
const CLASE_NOMBRE = "Pilates - Viernes 09:00";
const DIAS_GRACIA_SNAPSHOT = 8;
const VIERNES_JUNIO = [
  "2026-06-05",
  "2026-06-12",
  "2026-06-19",
  "2026-06-26",
];

(async () => {
  try {
    // Garantiza que exista la columna dias_gracia aunque el backend todavía no
    // se haya reiniciado con el modelo nuevo.
    await InscripcionMensual.sync({ alter: true });

    const clase = await Clase.findOne({ where: { nombre: CLASE_NOMBRE } });
    if (!clase) {
      throw new Error(
        `No existe la clase "${CLASE_NOMBRE}". Corré primero el seed principal (npm run seed:all).`,
      );
    }

    const actividad = await Actividad.findByPk(clase.actividad_id);
    const monto = actividad ? Number(actividad.precio) : 10000;

    // Idempotencia: limpiar cualquier corrida previa de este escenario.
    const previas = await InscripcionMensual.findAll({
      where: { cliente_email: CLIENTE, clase_id: clase.id },
    });
    const idsPrevios = previas.map((p) => p.id);
    if (idsPrevios.length) {
      await ReservaClase.destroy({ where: { inscripcion_mensual_id: idsPrevios } });
      await InscripcionMensual.destroy({ where: { id: idsPrevios } });
      console.log(`→ Limpiadas ${idsPrevios.length} inscripción(es) previa(s) del escenario.`);
    }

    // 1. Mensualidad de junio ya finalizada, con sus clases cumplidas.
    const anterior = await InscripcionMensual.create({
      cliente_email: CLIENTE,
      actividad_id: clase.actividad_id,
      clase_id: clase.id,
      periodo_inicio: "2026-06-01",
      periodo_fin: "2026-06-30",
      dia_vencimiento: "2026-06-10",
      monto,
      estado: "FINALIZADA",
    });

    for (const fecha of VIERNES_JUNIO) {
      await ReservaClase.create({
        cliente_email: CLIENTE,
        clase_id: clase.id,
        fecha_exacta: fecha,
        asistio: true,
        estado: "ACTIVA",
        inscripcion_mensual_id: anterior.id,
        inscripcion_individual_id: null,
      });
    }
    console.log(`→ Junio FINALIZADA creada (id ${anterior.id}) con ${VIERNES_JUNIO.length} clases.`);

    // 2. Días de gracia = 8 y generamos la mensualidad siguiente con la función
    //    real: snapshotea 8 en la fila y crea sus reservas PENDIENTE_PAGO.
    await actualizarConfiguracion({
      dias_gracia_mensual: DIAS_GRACIA_SNAPSHOT,
      recordatorio_pago_dia: 1,
    });
    const pendiente = await crearProximaMensualidadPendiente(anterior);
    if (!pendiente) {
      throw new Error("No se pudo generar la mensualidad de julio (crearProximaMensualidadPendiente devolvió null).");
    }

    // 3. Simulamos que ya venció el período anterior → pasa a EN_GRACIA.
    await pendiente.update({ estado: "EN_GRACIA" });
    console.log(
      `→ Julio EN_GRACIA creada (id ${pendiente.id}), dias_gracia=${pendiente.dias_gracia}, ` +
        `período ${pendiente.periodo_inicio} → fin de gracia 2026-07-08.`,
    );

    // 4. Bajamos la config a 1: NO debe afectar a la mensualidad ya en gracia.
    await actualizarConfiguracion({ dias_gracia_mensual: 1, recordatorio_pago_dia: 1 });
    console.log("→ Config global de días de gracia bajada a 1 (no afecta a la de julio).");

    console.log("\nListo. Entrá como cliente2@yopmail.com (pass 12345678) a \"Mis reservas\".");
    console.log("Debe aparecer la mensualidad de Pilates de julio con botón para completar el pago.");

    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message);
    if (err.stack) console.error(err.stack.split("\n").slice(1, 4).join("\n"));
    await conn.close();
    process.exit(1);
  }
})();
