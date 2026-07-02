"use strict";

const { ROLES_LIST } = require("../src/constants/roles");
const { PERMISOS_LIST, MATRIZ_ROL_PERMISOS } = require("../src/constants/permisos");

const PASSWORD_HASH = "$2b$10$ffl98yPUS3v1MULQpISaiekZQnnQDFgnVGCkbsWe1lcJm0VHHuaaS"; // hash for "12345678"

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    console.log("Wiping database...");
    // Reset and truncate all tables with RESTART IDENTITY and CASCADE
    await queryInterface.sequelize.query(`
      TRUNCATE TABLE 
        vales,
        pagos,
        reservas_clase,
        lista_espera,
        inscripciones_mensuales,
        inscripciones_individuales,
        clases,
        cancelaciones_clases,
        asistencias,
        salas,
        profesores,
        profesor_actividad,
        actividades,
        rol_permiso,
        usuarios,
        roles,
        permisos,
        clientes,
        configuracion_sistema
      RESTART IDENTITY CASCADE;
    `);

    console.log("Seeding roles and permissions...");
    // 1. Roles
    await queryInterface.bulkInsert(
      "roles",
      ROLES_LIST.map((nombre) => ({
        nombre,
        createdAt: now,
        updatedAt: now,
      })),
      {}
    );

    const [rolesDb] = await queryInterface.sequelize.query(`SELECT id, nombre FROM roles`);
    const rolIdPorNombre = Object.fromEntries(rolesDb.map((r) => [r.nombre, r.id]));

    // 2. Permisos
    await queryInterface.bulkInsert(
      "permisos",
      PERMISOS_LIST.map((clave) => ({
        clave,
        nombre: clave,
        createdAt: now,
        updatedAt: now,
      })),
      {}
    );

    const [permisosDb] = await queryInterface.sequelize.query(`SELECT id, clave FROM permisos`);
    const permisoIdPorClave = Object.fromEntries(permisosDb.map((p) => [p.clave, p.id]));

    // 3. Rol Permiso Join Table
    const rolPermisoFilas = [];
    for (const [nombreRol, claves] of Object.entries(MATRIZ_ROL_PERMISOS)) {
      const rol_id = rolIdPorNombre[nombreRol];
      if (!rol_id) continue;
      for (const clave of claves) {
        const permiso_id = permisoIdPorClave[clave];
        if (!permiso_id) continue;
        rolPermisoFilas.push({
          rol_id,
          permiso_id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    if (rolPermisoFilas.length > 0) {
      await queryInterface.bulkInsert("rol_permiso", rolPermisoFilas, {});
    }

    console.log("Seeding users (dueno, recepcion, 5 clientes)...");
    // 4. Usuarios
    const usuariosFilas = [
      {
        email: "dueno@yopmail.com",
        dni: "10000001",
        nombre: "Dueño",
        apellido: "Principal",
        telefono: "1155551111",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["DUEÑO"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "recepcion@yopmail.com",
        dni: "10000002",
        nombre: "Recepcion",
        apellido: "Demo",
        telefono: "1155556666",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["RECEPCIONISTA"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente1@yopmail.com",
        dni: "20000001",
        nombre: "Cliente",
        apellido: "Uno",
        telefono: "1133330001",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente2@yopmail.com",
        dni: "20000002",
        nombre: "Cliente",
        apellido: "Dos",
        telefono: "1133330002",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente3@yopmail.com",
        dni: "20000003",
        nombre: "Cliente",
        apellido: "Tres",
        telefono: "1133330003",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente4@yopmail.com",
        dni: "20000004",
        nombre: "Cliente",
        apellido: "Cuatro",
        telefono: "1133330004",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "cliente5@yopmail.com",
        dni: "20000005",
        nombre: "Cliente",
        apellido: "Cinco",
        telefono: "1133330005",
        password: PASSWORD_HASH,
        activo: true,
        rol_id: rolIdPorNombre["CLIENTE"],
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert("usuarios", usuariosFilas, {});

    // 5. Clientes (associated details)
    const clientesFilas = [
      {
        usuario_email: "cliente1@yopmail.com",
        genero: "masculino",
        fechaNacimiento: "1995-01-01",
        fichaMedica: "Apto físico presentado y vigente.",
        direccion: "Av. Siempreviva 742, Springfield",
        createdAt: now,
        updatedAt: now,
      },
      {
        usuario_email: "cliente2@yopmail.com",
        genero: "masculino",
        fechaNacimiento: "1995-02-02",
        fichaMedica: "Apto físico presentado y vigente.",
        direccion: "Calle Falsa 123, Springfield",
        createdAt: now,
        updatedAt: now,
      },
      {
        usuario_email: "cliente3@yopmail.com",
        genero: "masculino",
        fechaNacimiento: "1995-03-03",
        fichaMedica: "Apto físico presentado y vigente.",
        direccion: "Av. Corrientes 1000, CABA",
        createdAt: now,
        updatedAt: now,
      },
      {
        usuario_email: "cliente4@yopmail.com",
        genero: "femenino",
        fechaNacimiento: "1995-04-04",
        fichaMedica: "Apto físico presentado y vigente.",
        direccion: "Florida 500, CABA",
        createdAt: now,
        updatedAt: now,
      },
      {
        usuario_email: "cliente5@yopmail.com",
        genero: "femenino",
        fechaNacimiento: "1995-05-05",
        fichaMedica: "Apto físico presentado y vigente.",
        direccion: "Santa Fe 2000, CABA",
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert("clientes", clientesFilas, {});

    console.log("Seeding Catalog (Salas, Profesores, Actividades)...");
    // 6. Salas
    await queryInterface.bulkInsert(
      "salas",
      [
        {
          identificador: "S1",
          cupo: 20,
          estado_activo: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );
    const [salasDb] = await queryInterface.sequelize.query(`SELECT id FROM salas LIMIT 1`);
    const salaId = salasDb[0].id;

    // 7. Profesores
    await queryInterface.bulkInsert(
      "profesores",
      [
        {
          nombre: "Martín",
          apellido: "García",
          dni: "44444444",
          activo: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );
    const [profesoresDb] = await queryInterface.sequelize.query(`SELECT id FROM profesores LIMIT 1`);
    const profesorId = profesoresDb[0].id;

    // 8. Actividades
    await queryInterface.bulkInsert(
      "actividades",
      [
        {
          nombre: "Yoga",
          descripcion: "Clase de Yoga para relajación y estiramiento.",
          precio: 10000.00,
          activa: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          nombre: "Pilates",
          descripcion: "Entrenamiento de fuerza central y flexibilidad.",
          precio: 10000.00,
          activa: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          nombre: "Funcional",
          descripcion: "Entrenamiento funcional de alta intensidad.",
          precio: 10000.00,
          activa: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    const [actividadesDb] = await queryInterface.sequelize.query(`SELECT id, nombre FROM actividades`);
    const actIdPorNombre = Object.fromEntries(actividadesDb.map((a) => [a.nombre, a.id]));

    // Join Profesor Actividad
    await queryInterface.bulkInsert(
      "profesor_actividad",
      actividadesDb.map((act) => ({
        profesor_id: profesorId,
        actividad_id: act.id,
        createdAt: now,
        updatedAt: now,
      })),
      {}
    );

    console.log("Seeding Clases...");
    // 9. Clases
    await queryInterface.bulkInsert(
      "clases",
      [
        {
          nombre: "Yoga — Lunes 09:00",
          dia_semana: "Lunes",
          hora_inicio: "09:00:00",
          hora_fin: "10:00:00",
          cupo: 15,
          activa: true,
          actividad_id: actIdPorNombre["Yoga"],
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
        {
          nombre: "Pilates — Martes 10:00",
          dia_semana: "Martes",
          hora_inicio: "10:00:00",
          hora_fin: "11:00:00",
          cupo: 12,
          activa: true,
          actividad_id: actIdPorNombre["Pilates"],
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
        {
          nombre: "Funcional — Lunes 09:00",
          dia_semana: "Lunes",
          hora_inicio: "09:00:00",
          hora_fin: "10:00:00",
          cupo: 15,
          activa: true,
          actividad_id: actIdPorNombre["Funcional"],
          sala_id: salaId,
          profesor_id: profesorId,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    const [clasesDb] = await queryInterface.sequelize.query(`SELECT id, nombre FROM clases`);
    const claseIdPorNombre = Object.fromEntries(clasesDb.map((c) => [c.nombre, c.id]));

    console.log("Seeding Enrollments (Inscripciones mensuales for 3 clients)...");
    // 10. Inscripciones Mensuales (3 clients enrolled in Funcional class)
    const inscripcionesFilas = [
      {
        cliente_email: "cliente1@yopmail.com",
        actividad_id: actIdPorNombre["Funcional"],
        clase_id: claseIdPorNombre["Funcional — Lunes 09:00"],
        periodo_inicio: "2026-07-01",
        periodo_fin: "2026-07-31",
        dia_vencimiento: "2026-07-10",
        estado: "VIGENTE",
        monto: 10000.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        cliente_email: "cliente2@yopmail.com",
        actividad_id: actIdPorNombre["Funcional"],
        clase_id: claseIdPorNombre["Funcional — Lunes 09:00"],
        periodo_inicio: "2026-07-01",
        periodo_fin: "2026-07-31",
        dia_vencimiento: "2026-07-10",
        estado: "VIGENTE",
        monto: 10000.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        cliente_email: "cliente3@yopmail.com",
        actividad_id: actIdPorNombre["Funcional"],
        clase_id: claseIdPorNombre["Funcional — Lunes 09:00"],
        periodo_inicio: "2026-07-01",
        periodo_fin: "2026-07-31",
        dia_vencimiento: "2026-07-10",
        estado: "VIGENTE",
        monto: 10000.00,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert("inscripciones_mensuales", inscripcionesFilas, {});

    const [inscripcionesDb] = await queryInterface.sequelize.query(`SELECT id, cliente_email FROM inscripciones_mensuales`);
    const insIdPorEmail = Object.fromEntries(inscripcionesDb.map((i) => [i.cliente_email, i.id]));

    console.log("Seeding Reservas Clase (Active reservations for each Monday in July)...");
    const mondays = ["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27"];
    const reservasFilas = [];
    for (const email of ["cliente1@yopmail.com", "cliente2@yopmail.com", "cliente3@yopmail.com"]) {
      for (const fecha of mondays) {
        reservasFilas.push({
          cliente_email: email,
          clase_id: claseIdPorNombre["Funcional — Lunes 09:00"],
          fecha_exacta: fecha,
          asistio: null,
          estado: "ACTIVA",
          inscripcion_mensual_id: insIdPorEmail[email],
          inscripcion_individual_id: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await queryInterface.bulkInsert("reservas_clase", reservasFilas, {});

    console.log("Seeding Vouchers (Vales for each client for each activity)...");
    // 11. Vales (each of the 5 clients has a voucher for each of the 3 activities/classes)
    const valesFilas = [];
    const clasesNombres = ["Yoga — Lunes 09:00", "Pilates — Martes 10:00", "Funcional — Lunes 09:00"];
    const clientesEmails = [
      "cliente1@yopmail.com",
      "cliente2@yopmail.com",
      "cliente3@yopmail.com",
      "cliente4@yopmail.com",
      "cliente5@yopmail.com",
    ];

    for (const email of clientesEmails) {
      for (const nombreClase of clasesNombres) {
        valesFilas.push({
          cliente_email: email,
          clase_id: claseIdPorNombre[nombreClase],
          tipo: "MENSUAL",
          monto: 5000.00,
          valido_desde: "2026-07-01",
          valido_hasta: "2026-12-31",
          usado_en_pago_id: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await queryInterface.bulkInsert("vales", valesFilas, {});

    // 12. Configuracion Sistema
    await queryInterface.bulkInsert(
      "configuracion_sistema",
      [
        {
          id: 1,
          dias_gracia_mensual: 1,
          recordatorio_pago_dia: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    console.log("══════════════════════════════════════════════════════");
    console.log("  DATABASE SUCCESSFULLY INITIALIZED & SEEDED!");
    console.log("══════════════════════════════════════════════════════");
  },

  async down(queryInterface) {
    // No reversible
  },
};
