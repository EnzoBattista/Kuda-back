"use strict";

const bcrypt = require("bcrypt");

// ─── Constantes ─────────────────────────────────────────────────────────────
const NOMBRE_CLASE1 = "Test Clase Lunes";
const NOMBRE_CLASE2 = "Test Clase Miercoles";
const CUPO_CLASE = 10;

const FICHA_MEDICA_DEMO = "data:application/pdf;base64,JVBERi0xLjQK";

// Clientes de prueba
const CLIENTE_A = "cliente1@test.com";
const CLIENTE_B = "cliente2@test.com";
const CLIENTE_C = "cliente3@test.com";
const CLIENTE_D = "cliente4@test.com";

// Clientes adicionales para llenar cupo de Clase 2 (necesitamos 10 - 2 activas - 1 mensual = 7 más)
const CLIENTES_RELLENO_CLASE2 = [
  "cliente5@test.com",
  "cliente6@test.com",
  "cliente7@test.com",
  "cliente8@test.com",
  "cliente9@test.com",
  "cliente10@test.com",
  "cliente11@test.com",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");

/** Devuelve "YYYY-MM-DD" en hora local */
const fechaIso = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/**
 * Devuelve la próxima fecha (YYYY-MM-DD) del día de semana indicado.
 * Si hoy ya es ese día, devuelve HOY.
 * diasSemana: 0=Domingo, 1=Lunes, 2=Martes, ...
 */
const proximaFecha = (diaSemanaObj, diaObjetivo) => {
  const hoy = new Date(diaSemanaObj);
  hoy.setHours(0, 0, 0, 0);
  const diff = (diaObjetivo - hoy.getDay() + 7) % 7;
  hoy.setDate(hoy.getDate() + diff);
  return fechaIso(hoy);
};

/**
 * Genera fechas semanales dentro de [inicio, fin] (strings YYYY-MM-DD)
 * para el día de semana indicado (0=Dom..6=Sab).
 */
const fechasSemanales = (inicioIso, finIso, diaSemanaNum) => {
  const inicio = new Date(inicioIso + "T00:00:00");
  const fin = new Date(finIso + "T00:00:00");
  const fechas = [];
  // Avanzar hasta el primer día de semana correcto
  const diffPrimer = (diaSemanaNum - inicio.getDay() + 7) % 7;
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() + diffPrimer);
  while (cursor <= fin) {
    fechas.push(fechaIso(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return fechas;
};

/**
 * Asegura que el usuario + cliente existan en la BD.
 * Si no existen los crea con datos mínimos.
 */
const asegurarCliente = async (queryInterface, { email, dni, nombre, apellido, rolId, hash, now }) => {
  const [existente] = await queryInterface.sequelize.query(
    `SELECT email FROM usuarios WHERE email = :email LIMIT 1`,
    { replacements: { email } }
  );
  if (existente.length > 0) return;

  await queryInterface.bulkInsert("usuarios", [
    {
      email,
      dni,
      nombre,
      apellido,
      password: hash,
      activo: true,
      rol_id: rolId,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await queryInterface.bulkInsert("clientes", [
    {
      usuario_email: email,
      genero: "masculino",
      fechaNacimiento: "1990-01-15",
      fichaMedica: FICHA_MEDICA_DEMO,
      direccion: "Calle Test 123, CABA",
      createdAt: now,
      updatedAt: now,
    },
  ]);
};

/**
 * Asegura que el cliente tenga fichaMedica (requisito para reservas).
 */
const asegurarFichaMedica = async (queryInterface, email, now) => {
  await queryInterface.sequelize.query(
    `UPDATE clientes SET "fichaMedica" = COALESCE("fichaMedica", :ficha), "updatedAt" = :now WHERE "usuario_email" = :email`,
    { replacements: { email, ficha: FICHA_MEDICA_DEMO, now } }
  );
};

// ─── Seeder ──────────────────────────────────────────────────────────────────
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── Fecha local de hoy ──────────────────────────────────────────────────
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const hoy = fechaIso(hoyDate);

    // ── Dependencias base ───────────────────────────────────────────────────
    const [actFuncional] = await queryInterface.sequelize.query(
      `SELECT id, precio FROM actividades WHERE nombre = 'Funcional' LIMIT 1`
    );
    const [actYoga] = await queryInterface.sequelize.query(
      `SELECT id, precio FROM actividades WHERE nombre = 'Yoga' LIMIT 1`
    );
    const [salas] = await queryInterface.sequelize.query(
      `SELECT id FROM salas WHERE "identificador" = 'A-03' LIMIT 1`
    );
    const [profesores] = await queryInterface.sequelize.query(
      `SELECT id FROM profesores ORDER BY id ASC LIMIT 1`
    );
    const [rolCliente] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = 'CLIENTE' LIMIT 1`
    );

    if (!actFuncional[0] || !actYoga[0] || !salas[0] || !profesores[0] || !rolCliente[0]) {
      console.warn("[seeder test-reservas] Faltan dependencias base (actividades/salas/profesores/roles).");
      return;
    }

    const actividadFuncionalId = actFuncional[0].id;
    const actividadYogaId = actYoga[0].id;
    const precioFuncional = parseFloat(actFuncional[0].precio) || 30000;
    const precioYoga = parseFloat(actYoga[0].precio) || 25000;
    const salaId = salas[0].id;
    const profesorId = profesores[0].id;
    const rolClienteId = rolCliente[0].id;

    // ── Hash para clientes nuevos ───────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("12345678", salt);

    // ── Asegurar cliente C y D ──────────────────────────────────────────────
    await asegurarCliente(queryInterface, {
      email: CLIENTE_C, dni: "66666663", nombre: "Cliente", apellido: "Tres",
      rolId: rolClienteId, hash, now,
    });
    await asegurarCliente(queryInterface, {
      email: CLIENTE_D, dni: "66666664", nombre: "Cliente", apellido: "Cuatro",
      rolId: rolClienteId, hash, now,
    });

    // Asegurar clientes de relleno para el cupo lleno
    for (let i = 0; i < CLIENTES_RELLENO_CLASE2.length; i++) {
      const email = CLIENTES_RELLENO_CLASE2[i];
      const num = 5 + i; // cliente5 ... cliente11
      await asegurarCliente(queryInterface, {
        email,
        dni: String(66666660 + num),
        nombre: "Cliente",
        apellido: `Relleno ${num}`,
        rolId: rolClienteId,
        hash,
        now,
      });
    }

    // Asegurar fichaMedica en todos los clientes participantes
    const todosLosClientes = [CLIENTE_A, CLIENTE_B, CLIENTE_C, CLIENTE_D, ...CLIENTES_RELLENO_CLASE2];
    for (const email of todosLosClientes) {
      await asegurarFichaMedica(queryInterface, email, now);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CLASE 1 — Lunes, Funcional (para casos 1, 2, 3, 8, 9)
    // ════════════════════════════════════════════════════════════════════════
    let clase1Id;
    const [clase1Existente] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE1 } }
    );
    if (clase1Existente.length > 0) {
      clase1Id = clase1Existente[0].id;
    } else {
      await queryInterface.bulkInsert("clases", [
        {
          nombre: NOMBRE_CLASE1,
          dia_semana: "Lunes",
          hora_inicio: "09:00:00",
          hora_fin: "10:00:00",
          cupo: CUPO_CLASE,
          activa: true,
          actividad_id: actividadFuncionalId,
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const [nueva1] = await queryInterface.sequelize.query(
        `SELECT id FROM clases WHERE nombre = :nombre ORDER BY id DESC LIMIT 1`,
        { replacements: { nombre: NOMBRE_CLASE1 } }
      );
      clase1Id = nueva1[0].id;
    }

    // ════════════════════════════════════════════════════════════════════════
    // CLASE 2 — Miercoles, Yoga (para casos 4, 5, 6, 7)
    // ════════════════════════════════════════════════════════════════════════
    let clase2Id;
    const [clase2Existente] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE2 } }
    );
    if (clase2Existente.length > 0) {
      clase2Id = clase2Existente[0].id;
    } else {
      await queryInterface.bulkInsert("clases", [
        {
          nombre: NOMBRE_CLASE2,
          dia_semana: "Miercoles",
          hora_inicio: "11:00:00",
          hora_fin: "12:00:00",
          cupo: CUPO_CLASE,
          activa: true,
          actividad_id: actividadYogaId,
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const [nueva2] = await queryInterface.sequelize.query(
        `SELECT id FROM clases WHERE nombre = :nombre ORDER BY id DESC LIMIT 1`,
        { replacements: { nombre: NOMBRE_CLASE2 } }
      );
      clase2Id = nueva2[0].id;
    }

    // Próximas fechas para cada clase
    const fechaClase1 = proximaFecha(hoyDate, 1); // Próximo Lunes (0=Dom, 1=Lun)
    const fechaClase2 = proximaFecha(hoyDate, 3); // Próximo Miércoles

    console.info(`[seeder test-reservas] Clase 1 (${NOMBRE_CLASE1}, id ${clase1Id}) → próxima fecha Lunes: ${fechaClase1}`);
    console.info(`[seeder test-reservas] Clase 2 (${NOMBRE_CLASE2}, id ${clase2Id}) → próxima fecha Miércoles: ${fechaClase2}`);

    // ════════════════════════════════════════════════════════════════════════
    // CASO 1: Reserva individual ACTIVA — Cliente A en Clase 1
    // ════════════════════════════════════════════════════════════════════════
    {
      const [existeInsc] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha LIMIT 1`,
        { replacements: { email: CLIENTE_A, claseId: clase1Id, fecha: fechaClase1 } }
      );
      let inscId;
      if (existeInsc.length > 0) {
        inscId = existeInsc[0].id;
      } else {
        await queryInterface.bulkInsert("inscripciones_individuales", [
          {
            cliente_email: CLIENTE_A,
            actividad_id: actividadFuncionalId,
            clase_id: clase1Id,
            fecha: fechaClase1,
            modalidad: "COMPLETO",
            estado_seña: null,
            vencimiento_seña: null,
            monto_total: precioFuncional,
            monto_pagado: precioFuncional,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        const [r] = await queryInterface.sequelize.query(
          `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha ORDER BY id DESC LIMIT 1`,
          { replacements: { email: CLIENTE_A, claseId: clase1Id, fecha: fechaClase1 } }
        );
        inscId = r[0].id;
      }

      const [existeRes] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha AND estado = 'ACTIVA' LIMIT 1`,
        { replacements: { email: CLIENTE_A, claseId: clase1Id, fecha: fechaClase1 } }
      );
      if (existeRes.length === 0) {
        await queryInterface.bulkInsert("reservas_clase", [
          {
            cliente_email: CLIENTE_A,
            clase_id: clase1Id,
            fecha_exacta: fechaClase1,
            asistio: null,
            estado: "ACTIVA",
            inscripcion_mensual_id: null,
            inscripcion_individual_id: inscId,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      console.info(`[caso 1] Reserva individual ACTIVA — ${CLIENTE_A} en Clase1 el ${fechaClase1}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 2: Reserva individual con SEÑA PENDIENTE — Cliente B en Clase 1
    // ════════════════════════════════════════════════════════════════════════
    {
      const vencimientoSeña = new Date(now);
      vencimientoSeña.setDate(vencimientoSeña.getDate() + 3); // vence en 3 días

      const [existeInsc] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha LIMIT 1`,
        { replacements: { email: CLIENTE_B, claseId: clase1Id, fecha: fechaClase1 } }
      );
      let inscId;
      if (existeInsc.length > 0) {
        inscId = existeInsc[0].id;
      } else {
        await queryInterface.bulkInsert("inscripciones_individuales", [
          {
            cliente_email: CLIENTE_B,
            actividad_id: actividadFuncionalId,
            clase_id: clase1Id,
            fecha: fechaClase1,
            modalidad: "SEÑA",
            estado_seña: "PENDIENTE",
            vencimiento_seña: vencimientoSeña,
            monto_total: precioFuncional,
            monto_pagado: precioFuncional * 0.3, // 30% de seña
            createdAt: now,
            updatedAt: now,
          },
        ]);
        const [r] = await queryInterface.sequelize.query(
          `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha ORDER BY id DESC LIMIT 1`,
          { replacements: { email: CLIENTE_B, claseId: clase1Id, fecha: fechaClase1 } }
        );
        inscId = r[0].id;
      }

      const [existeRes] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha AND estado = 'ACTIVA' LIMIT 1`,
        { replacements: { email: CLIENTE_B, claseId: clase1Id, fecha: fechaClase1 } }
      );
      if (existeRes.length === 0) {
        await queryInterface.bulkInsert("reservas_clase", [
          {
            cliente_email: CLIENTE_B,
            clase_id: clase1Id,
            fecha_exacta: fechaClase1,
            asistio: null,
            estado: "ACTIVA",
            inscripcion_mensual_id: null,
            inscripcion_individual_id: inscId,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      console.info(`[caso 2] Reserva individual con SEÑA PENDIENTE — ${CLIENTE_B} en Clase1 el ${fechaClase1}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 3: Reserva individual CANCELADA — Cliente C en Clase 1
    // ════════════════════════════════════════════════════════════════════════
    {
      const fechaCancelada = fechaClase1;

      const [existeInsc] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha LIMIT 1`,
        { replacements: { email: CLIENTE_C, claseId: clase1Id, fecha: fechaCancelada } }
      );
      let inscId;
      if (existeInsc.length > 0) {
        inscId = existeInsc[0].id;
      } else {
        await queryInterface.bulkInsert("inscripciones_individuales", [
          {
            cliente_email: CLIENTE_C,
            actividad_id: actividadFuncionalId,
            clase_id: clase1Id,
            fecha: fechaCancelada,
            modalidad: "COMPLETO",
            estado_seña: null,
            vencimiento_seña: null,
            monto_total: precioFuncional,
            monto_pagado: precioFuncional,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        const [r] = await queryInterface.sequelize.query(
          `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha ORDER BY id DESC LIMIT 1`,
          { replacements: { email: CLIENTE_C, claseId: clase1Id, fecha: fechaCancelada } }
        );
        inscId = r[0].id;
      }

      // La reserva cancelada no viola el índice parcial (solo ACTIVA es única)
      const [existeRes] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha AND estado = 'CANCELADA' LIMIT 1`,
        { replacements: { email: CLIENTE_C, claseId: clase1Id, fecha: fechaCancelada } }
      );
      if (existeRes.length === 0) {
        await queryInterface.bulkInsert("reservas_clase", [
          {
            cliente_email: CLIENTE_C,
            clase_id: clase1Id,
            fecha_exacta: fechaCancelada,
            asistio: null,
            estado: "CANCELADA",
            inscripcion_mensual_id: null,
            inscripcion_individual_id: inscId,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      console.info(`[caso 3] Reserva individual CANCELADA — ${CLIENTE_C} en Clase1 el ${fechaCancelada}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 4: Cupo lleno en Clase 2 — crear suficientes reservas ACTIVAS
    // Clientes que ocuparán el cupo: CLIENTE_A, CLIENTE_B + CLIENTES_RELLENO (7 más) = 9 total
    // CLIENTE_C queda fuera → irá a lista de espera (caso 7)
    // ════════════════════════════════════════════════════════════════════════
    const clientesCupoClase2 = [CLIENTE_A, CLIENTE_B, ...CLIENTES_RELLENO_CLASE2];
    // Son exactamente 9 + la mensual de cliente A = 10 (o manejamos 10 individuales para llenar)
    // Para garantizar cupo lleno sin mensual, usamos 10 individuales distintos:
    const clientesCupoCompleto = [...clientesCupoClase2]; // 9 clientes → cupo 10 
    // Agregamos CLIENTE_D como el décimo ocupante individual
    clientesCupoCompleto.push(CLIENTE_D);

    for (const email of clientesCupoCompleto) {
      const [existeInsc] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha LIMIT 1`,
        { replacements: { email, claseId: clase2Id, fecha: fechaClase2 } }
      );
      let inscId;
      if (existeInsc.length > 0) {
        inscId = existeInsc[0].id;
      } else {
        await queryInterface.bulkInsert("inscripciones_individuales", [
          {
            cliente_email: email,
            actividad_id: actividadYogaId,
            clase_id: clase2Id,
            fecha: fechaClase2,
            modalidad: "COMPLETO",
            estado_seña: null,
            vencimiento_seña: null,
            monto_total: precioYoga,
            monto_pagado: precioYoga,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        const [r] = await queryInterface.sequelize.query(
          `SELECT id FROM inscripciones_individuales WHERE cliente_email = :email AND clase_id = :claseId AND fecha = :fecha ORDER BY id DESC LIMIT 1`,
          { replacements: { email, claseId: clase2Id, fecha: fechaClase2 } }
        );
        inscId = r[0].id;
      }

      const [existeRes] = await queryInterface.sequelize.query(
        `SELECT id FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha AND estado = 'ACTIVA' LIMIT 1`,
        { replacements: { email, claseId: clase2Id, fecha: fechaClase2 } }
      );
      if (existeRes.length === 0) {
        await queryInterface.bulkInsert("reservas_clase", [
          {
            cliente_email: email,
            clase_id: clase2Id,
            fecha_exacta: fechaClase2,
            asistio: null,
            estado: "ACTIVA",
            inscripcion_mensual_id: null,
            inscripcion_individual_id: inscId,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }
    console.info(`[caso 4] Cupo lleno en Clase2 — ${clientesCupoCompleto.length}/${CUPO_CLASE} reservas ACTIVAS el ${fechaClase2}`);

    // ════════════════════════════════════════════════════════════════════════
    // CASO 5: Inscripción mensual VIGENTE — Cliente A en Clase 2
    // periodo_inicio = hoy, periodo_fin = hoy + 1 mes
    // Con reservas semanales generadas automáticamente
    // NOTA: Cliente A ya tiene reserva individual para fechaClase2 (caso 4).
    //       La inscripción mensual genera reservas para TODAS las semanas del período,
    //       excepto la que ya tiene (o si hay conflicto de unicidad, se omite).
    // Para evitar conflicto XOR, usamos Clase2 en días distintos a la reserva individual.
    // En realidad el índice parcial solo impide dos ACTIVAS del mismo cliente/clase/fecha.
    // La inscripción mensual usa inscripcion_mensual_id, así que son registros diferentes.
    // Sin embargo, ya hay una reserva ACTIVA de cliente_A en clase2 el fechaClase2 (caso 4).
    // Para evitar duplicado, omitimos esa fecha en la inscripción mensual.
    // ════════════════════════════════════════════════════════════════════════
    {
      const periodoInicioDate = new Date(hoyDate);
      const periodoFinDate = new Date(hoyDate);
      periodoFinDate.setMonth(periodoFinDate.getMonth() + 1);

      const periodoInicio = fechaIso(periodoInicioDate);
      const periodoFin = fechaIso(periodoFinDate);
      const diaVencimiento = periodoFin;

      const [existeInscMensual] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_mensuales WHERE cliente_email = :email AND clase_id = :claseId AND periodo_inicio = :inicio LIMIT 1`,
        { replacements: { email: CLIENTE_A, claseId: clase2Id, inicio: periodoInicio } }
      );

      let inscMensualId;
      if (existeInscMensual.length > 0) {
        inscMensualId = existeInscMensual[0].id;
      } else {
        await queryInterface.bulkInsert("inscripciones_mensuales", [
          {
            cliente_email: CLIENTE_A,
            actividad_id: actividadYogaId,
            clase_id: clase2Id,
            periodo_inicio: periodoInicio,
            periodo_fin: periodoFin,
            dia_vencimiento: diaVencimiento,
            estado: "VIGENTE",
            monto: precioYoga,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        const [r] = await queryInterface.sequelize.query(
          `SELECT id FROM inscripciones_mensuales WHERE cliente_email = :email AND clase_id = :claseId AND periodo_inicio = :inicio ORDER BY id DESC LIMIT 1`,
          { replacements: { email: CLIENTE_A, claseId: clase2Id, inicio: periodoInicio } }
        );
        inscMensualId = r[0].id;
      }

      // Generar reservas para cada miércoles del período
      // Clase2 es Miercoles → diaSemanaNum = 3
      const fechasMiercoles = fechasSemanales(periodoInicio, periodoFin, 3);
      let reservasMensualesCreadas = 0;
      for (const fecha of fechasMiercoles) {
        // Verificar si ya hay reserva ACTIVA para ese cliente/clase/fecha
        const [existeResActiva] = await queryInterface.sequelize.query(
          `SELECT id FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha AND estado = 'ACTIVA' LIMIT 1`,
          { replacements: { email: CLIENTE_A, claseId: clase2Id, fecha } }
        );
        if (existeResActiva.length > 0) {
          // Ya hay una reserva activa (del caso 4 para la fecha del Miércoles más cercano), saltar
          continue;
        }
        await queryInterface.bulkInsert("reservas_clase", [
          {
            cliente_email: CLIENTE_A,
            clase_id: clase2Id,
            fecha_exacta: fecha,
            asistio: null,
            estado: "ACTIVA",
            inscripcion_mensual_id: inscMensualId,
            inscripcion_individual_id: null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        reservasMensualesCreadas++;
      }
      console.info(`[caso 5] Inscripción mensual VIGENTE — ${CLIENTE_A} en Clase2 (${periodoInicio} → ${periodoFin}), ${reservasMensualesCreadas} reservas generadas`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 6: Inscripción mensual EN_GRACIA — Cliente B en Clase 2
    // periodo vencido hace 5 días
    // ════════════════════════════════════════════════════════════════════════
    {
      const periodoFinDate = new Date(hoyDate);
      periodoFinDate.setDate(periodoFinDate.getDate() - 5); // vencido hace 5 días
      const periodoInicioDate = new Date(periodoFinDate);
      periodoInicioDate.setMonth(periodoInicioDate.getMonth() - 1);

      const periodoInicio = fechaIso(periodoInicioDate);
      const periodoFin = fechaIso(periodoFinDate);
      const diaVencimiento = periodoFin;

      const [existeInscMensual] = await queryInterface.sequelize.query(
        `SELECT id FROM inscripciones_mensuales WHERE cliente_email = :email AND clase_id = :claseId AND periodo_inicio = :inicio LIMIT 1`,
        { replacements: { email: CLIENTE_B, claseId: clase2Id, inicio: periodoInicio } }
      );

      let inscMensualId;
      if (existeInscMensual.length > 0) {
        inscMensualId = existeInscMensual[0].id;
      } else {
        await queryInterface.bulkInsert("inscripciones_mensuales", [
          {
            cliente_email: CLIENTE_B,
            actividad_id: actividadYogaId,
            clase_id: clase2Id,
            periodo_inicio: periodoInicio,
            periodo_fin: periodoFin,
            dia_vencimiento: diaVencimiento,
            estado: "EN_GRACIA",
            monto: precioYoga,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        const [r] = await queryInterface.sequelize.query(
          `SELECT id FROM inscripciones_mensuales WHERE cliente_email = :email AND clase_id = :claseId AND periodo_inicio = :inicio ORDER BY id DESC LIMIT 1`,
          { replacements: { email: CLIENTE_B, claseId: clase2Id, inicio: periodoInicio } }
        );
        inscMensualId = r[0].id;
      }

      // Generar reservas pasadas (ya finalizadas — dentro del período vencido)
      const fechasMiercoles = fechasSemanales(periodoInicio, periodoFin, 3);
      let reservasCreadas = 0;
      for (const fecha of fechasMiercoles) {
        const [existeRes] = await queryInterface.sequelize.query(
          `SELECT id FROM reservas_clase WHERE cliente_email = :email AND clase_id = :claseId AND fecha_exacta = :fecha LIMIT 1`,
          { replacements: { email: CLIENTE_B, claseId: clase2Id, fecha } }
        );
        if (existeRes.length > 0) continue;
        await queryInterface.bulkInsert("reservas_clase", [
          {
            cliente_email: CLIENTE_B,
            clase_id: clase2Id,
            fecha_exacta: fecha,
            asistio: true,
            estado: "ACTIVA",
            inscripcion_mensual_id: inscMensualId,
            inscripcion_individual_id: null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        reservasCreadas++;
      }
      console.info(`[caso 6] Inscripción mensual EN_GRACIA — ${CLIENTE_B} en Clase2 (${periodoInicio} → ${periodoFin}), vencida hace 5 días, ${reservasCreadas} reservas pasadas`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 7: Lista de espera INDIVIDUAL — Cliente C en Clase 2 (cupo lleno)
    // ════════════════════════════════════════════════════════════════════════
    {
      const [existeEspera] = await queryInterface.sequelize.query(
        `SELECT id FROM lista_espera WHERE cliente_email = :email AND clase_id = :claseId AND tipo = 'INDIVIDUAL' AND fecha_exacta = :fecha LIMIT 1`,
        { replacements: { email: CLIENTE_C, claseId: clase2Id, fecha: fechaClase2 } }
      );
      if (existeEspera.length === 0) {
        await queryInterface.bulkInsert("lista_espera", [
          {
            clase_id: clase2Id,
            cliente_email: CLIENTE_C,
            tipo: "INDIVIDUAL",
            fecha_exacta: fechaClase2,
            estado: "ESPERANDO",
            posicion: 1,
            notificado_en: null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      console.info(`[caso 7] Lista espera INDIVIDUAL — ${CLIENTE_C} en Clase2 el ${fechaClase2} (posición 1)`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 8: Lista de espera MENSUAL — Cliente C en Clase 1 (posición 1)
    // ════════════════════════════════════════════════════════════════════════
    {
      const [existeEspera] = await queryInterface.sequelize.query(
        `SELECT id FROM lista_espera WHERE cliente_email = :email AND clase_id = :claseId AND tipo = 'MENSUAL' LIMIT 1`,
        { replacements: { email: CLIENTE_C, claseId: clase1Id } }
      );
      if (existeEspera.length === 0) {
        await queryInterface.bulkInsert("lista_espera", [
          {
            clase_id: clase1Id,
            cliente_email: CLIENTE_C,
            tipo: "MENSUAL",
            fecha_exacta: null,
            estado: "ESPERANDO",
            posicion: 1,
            notificado_en: null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      console.info(`[caso 8] Lista espera MENSUAL — ${CLIENTE_C} en Clase1 (posición 1)`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 9: Lista de espera MENSUAL — Cliente D en Clase 1 (posición 2)
    // ════════════════════════════════════════════════════════════════════════
    {
      const [existeEspera] = await queryInterface.sequelize.query(
        `SELECT id FROM lista_espera WHERE cliente_email = :email AND clase_id = :claseId AND tipo = 'MENSUAL' LIMIT 1`,
        { replacements: { email: CLIENTE_D, claseId: clase1Id } }
      );
      if (existeEspera.length === 0) {
        await queryInterface.bulkInsert("lista_espera", [
          {
            clase_id: clase1Id,
            cliente_email: CLIENTE_D,
            tipo: "MENSUAL",
            fecha_exacta: null,
            estado: "ESPERANDO",
            posicion: 2,
            notificado_en: null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      console.info(`[caso 9] Lista espera MENSUAL — ${CLIENTE_D} en Clase1 (posición 2)`);
    }

    console.info("\n[seeder test-reservas-lista-espera] ✅ Todos los casos de prueba creados correctamente.");
    console.info(`  Clase1 (${NOMBRE_CLASE1}) id=${clase1Id}, Clase2 (${NOMBRE_CLASE2}) id=${clase2Id}`);
    console.info(`  clienteA=${CLIENTE_A}, clienteB=${CLIENTE_B}, clienteC=${CLIENTE_C}, clienteD=${CLIENTE_D}`);
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DOWN — Limpia todo lo creado por este seeder
  // ══════════════════════════════════════════════════════════════════════════
  async down(queryInterface) {
    const now = new Date();
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);

    // Obtener IDs de las clases creadas por este seeder
    const [clase1] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE1 } }
    );
    const [clase2] = await queryInterface.sequelize.query(
      `SELECT id FROM clases WHERE nombre = :nombre LIMIT 1`,
      { replacements: { nombre: NOMBRE_CLASE2 } }
    );

    const claseIds = [...(clase1.map((c) => c.id)), ...(clase2.map((c) => c.id))];

    if (claseIds.length > 0) {
      const claseIdsSql = claseIds.join(",");

      // Eliminar lista de espera
      await queryInterface.sequelize.query(
        `DELETE FROM lista_espera WHERE clase_id IN (${claseIdsSql})`
      );

      // Eliminar reservas de clase
      await queryInterface.sequelize.query(
        `DELETE FROM reservas_clase WHERE clase_id IN (${claseIdsSql})`
      );

      // Eliminar inscripciones mensuales
      await queryInterface.sequelize.query(
        `DELETE FROM inscripciones_mensuales WHERE clase_id IN (${claseIdsSql})`
      );

      // Eliminar inscripciones individuales
      await queryInterface.sequelize.query(
        `DELETE FROM inscripciones_individuales WHERE clase_id IN (${claseIdsSql})`
      );

      // Eliminar las clases en sí
      await queryInterface.bulkDelete("clases", { nombre: [NOMBRE_CLASE1, NOMBRE_CLASE2] }, {});
    }

    // Eliminar clientes extra creados solo por este seeder (cliente3, cliente4, cliente5...cliente11)
    // (cliente1 y cliente2 son de otro seeder, no los tocamos)
    const emailsExtraCreados = [CLIENTE_C, CLIENTE_D, ...CLIENTES_RELLENO_CLASE2];

    // Solo eliminar si no los creó otro seeder (verificamos si existen en lista_espera u otras clases)
    for (const email of emailsExtraCreados) {
      // Chequear si el usuario tiene actividad en otras clases antes de borrar
      const [otraActividad] = await queryInterface.sequelize.query(
        `SELECT 1 FROM reservas_clase WHERE cliente_email = :email LIMIT 1 UNION ALL SELECT 1 FROM inscripciones_mensuales WHERE cliente_email = :email LIMIT 1 UNION ALL SELECT 1 FROM lista_espera WHERE cliente_email = :email LIMIT 1 UNION ALL SELECT 1 FROM inscripciones_individuales WHERE cliente_email = :email LIMIT 1`,
        { replacements: { email } }
      );
      if (otraActividad.length === 0) {
        await queryInterface.bulkDelete("clientes", { usuario_email: email }, {});
        await queryInterface.bulkDelete("usuarios", { email }, {});
      }
    }

    console.info("[seeder test-reservas-lista-espera] ✅ Down completado.");
  },
};
