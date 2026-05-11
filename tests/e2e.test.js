process.env.JWT_SECRET = "supersecret123";
require("dotenv").config();
const request = require("supertest");
const app = require("../app");
const { conn } = require("../db");
const seedRoles = require("../seeders/20260505000000-roles-permisos");

let server;
let adminToken = "";
let clienteToken = "";
let adminEmail = "admin@test.com";
let clienteEmail = "cliente@test.com";
let actividadId;
let claseId;
let profesorId;
let salaId;

beforeAll(async () => {
  // Configurar base de datos en blanco
  await conn.sync({ force: true });
  // Plantar roles y permisos base
  await seedRoles.up(conn.getQueryInterface());

  // Crear usuario admin
  const rolAdmin = await conn.models.Rol.findOne({ where: { nombre: "ADMIN" } });
  await conn.models.Usuario.create({
    email: adminEmail,
    dni: "11111111",
    nombre: "Admin",
    apellido: "Test",
    password: "password123",
    activo: true,
    rol_id: rolAdmin.id
  });

  // Crear usuario cliente
  const rolCliente = await conn.models.Rol.findOne({ where: { nombre: "CLIENTE" } });
  await conn.models.Usuario.create({
    email: clienteEmail,
    dni: "22222222",
    nombre: "Cliente",
    apellido: "Test",
    password: "password123",
    activo: true,
    rol_id: rolCliente.id
  });

  // El modelo Cliente depende de Usuario para usuarios cliente
  await conn.models.Cliente.create({
    usuario_email: clienteEmail,
    fechaNacimiento: "2000-01-01"
  });

  // Crear Actividad directamente (no hay endpoint CRUD aún)
  const actividad = await conn.models.Actividad.create({
    nombre: "Crossfit",
    descripcion: "Entrenamiento funcional",
    precio: 10000,
    estado: true,
    requiereAptoFisico: true,
  });
  actividadId = actividad.id;

  // Crear Sala directamente (no hay endpoint CRUD aún)
  const sala = await conn.models.Sala.create({
    nombre: "Sala Principal",
    identificador: "S1",
    cupo: 20,
  });
  salaId = sala.id;
});

afterAll(async () => {
  await conn.close();
});

describe("Flujo E2E Kuda-back", () => {
  describe("1. Autenticación y Usuarios", () => {
    it("Debe iniciar sesión correctamente con credenciales de Administrador, devolviendo el JWT y verificando el rol", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: adminEmail,
        password: "password123",
      });
      if (res.statusCode !== 200) console.error("Admin Login Error:", res.body);

      // Verificamos estado y que devuelva token
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();

      // Verificamos la información del usuario logueado
      expect(res.body.usuario.email).toBe(adminEmail);
      expect(res.body.usuario.rol.nombre).toBe("ADMIN");

      adminToken = res.body.token;
    });

    it("Debe iniciar sesión con credenciales de Cliente, devolviendo el JWT para reservas", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: clienteEmail,
        password: "password123",
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.usuario.email).toBe(clienteEmail);
      expect(res.body.usuario.rol.nombre).toBe("CLIENTE");

      clienteToken = res.body.token;
    });
  });

  describe("2. Catálogo (Profesores)", () => {
    it("Debe permitir al Administrador registrar un Profesor, asegurando su vinculación a las Actividades correspondientes", async () => {
      const res = await request(app)
        .post("/api/profesores")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nombre: "Profe",
          apellido: "Test",
          dni: "33333333",
          email: "profe@test.com",
          telefono: "123456789",
          activo: true,
          actividades: [actividadId],
        });
      if (res.statusCode !== 201) console.error("Profe Error:", res.body);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("Profesor registrado con éxito");

      // Validar datos guardados
      expect(res.body.profesor.nombre).toBe("Profe");
      expect(res.body.profesor.dni).toBe("33333333");

      profesorId = res.body.profesor.id;
    });
  });

  describe("3. Clases", () => {
    it("Debe crear una Clase validando que guarde correctamente las relaciones foreign key (Actividad, Sala, Profesor)", async () => {
      const res = await request(app)
        .post("/api/clases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nombre: "Crossfit Inicial",
          dia_semana: "Lunes",
          hora_inicio: "10:00:00",
          hora_fin: "11:00:00",
          cupo: 15,
          activa: true,
          actividad_id: actividadId,
          sala_id: salaId,
          profesor_id: profesorId,
        });
      if (res.statusCode !== 201) console.error("Clase Error:", res.body);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("La clase fue agendada exitosamente");

      // Chequear integridad referencial guardada
      expect(res.body.clase.actividad_id).toBe(actividadId);
      expect(res.body.clase.sala_id).toBe(salaId);
      expect(res.body.clase.profesor_id).toBe(profesorId);
      expect(res.body.clase.cupo).toBe(15);

      claseId = res.body.clase.id;
    });
  });

  describe("4. Inscripciones Mensuales e Individuales (Validación de Refactor)", () => {
    it("Debe generar una Inscripción Mensual vinculada de manera directa a la Actividad y Clase, confirmando la eliminación del modelo 'Plan'", async () => {
      const res = await request(app)
        .post("/api/inscripciones-mensuales")
        .set("Authorization", `Bearer ${clienteToken}`) // El cliente se inscribe a sí mismo
        .send({
          periodo_inicio: "2026-06-01",
          periodo_fin: "2026-06-30",
          dia_vencimiento: "2026-06-05",
          estado: "PENDIENTE",
          monto: 10000,
          cliente_email: clienteEmail,
          actividad_id: actividadId,
          clase_id: claseId,
        });
      if (res.statusCode !== 201) console.error("Mensual Error:", res.body);

      expect(res.statusCode).toBe(201);

      // Validación estricta del refactor:
      // 1. Debe existir actividad_id apuntando directo a la Actividad
      expect(res.body.actividad_id).toBe(actividadId);

      // 2. Debe existir la clase_id para la asistencia
      expect(res.body.clase_id).toBe(claseId);

      // 3. El plan_id DEBE ser indefinido (ya no existe intermediario)
      expect(res.body.plan_id).toBeUndefined();

      // 4. Verificamos asignación al cliente correcto
      expect(res.body.cliente_email).toBe(clienteEmail);
    });

    it("Debe generar una Inscripción Individual (Clase Suelta) ligada directamente a la Actividad, garantizando la independencia estructural", async () => {
      const res = await request(app)
        .post("/api/inscripciones-individuales")
        .set("Authorization", `Bearer ${clienteToken}`)
        .send({
          fecha: "2026-05-15",
          modalidad: "COMPLETO",
          monto_total: 3330,
          monto_pagado: 3330,
          cliente_email: clienteEmail,
          actividad_id: actividadId,
          clase_id: claseId,
        });
      if (res.statusCode !== 201) console.error("Individual Error:", res.body);

      expect(res.statusCode).toBe(201);

      // Validación estricta del refactor:
      expect(res.body.actividad_id).toBe(actividadId);
      expect(res.body.clase_id).toBe(claseId);
      expect(res.body.plan_id).toBeUndefined(); // Confirmar ausencia de plan

      // Validar datos de pago individual
      expect(res.body.modalidad).toBe("COMPLETO");
      expect(Number(res.body.monto_total)).toBe(3330); // Independientemente de si viene como string o number
    });
  });
});

