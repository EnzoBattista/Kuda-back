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

  // La Actividad ahora se creará mediante el endpoint en el test de Catálogo (Actividades)

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

    it("Debe permitir cerrar sesión a un usuario autenticado y rechazar si no hay token", async () => {
      const sinToken = await request(app).post("/api/auth/logout");
      expect(sinToken.statusCode).toBe(401);

      const conToken = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${clienteToken}`);
      expect(conToken.statusCode).toBe(200);
      expect(conToken.body.message).toMatch(/sesión cerrada/i);
    });

    it("Debe permitir al admin registrar un recepcionista (HU49) y rechazar duplicados o sin permiso", async () => {
      const ok = await request(app)
        .post("/api/recepcionistas")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "recep@test.com",
          dni: "44444444",
          nombre: "Recep",
          apellido: "Test",
          telefono: "555",
          password: "password123",
        });
      expect(ok.statusCode).toBe(201);
      expect(ok.body.recepcionista.email).toBe("recep@test.com");

      const duplicado = await request(app)
        .post("/api/recepcionistas")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "recep@test.com",
          dni: "44444444",
          nombre: "Recep",
          apellido: "Test",
          password: "password123",
        });
      expect(duplicado.statusCode).toBe(409);

      const sinPermiso = await request(app)
        .post("/api/recepcionistas")
        .set("Authorization", `Bearer ${clienteToken}`)
        .send({
          email: "otro@test.com",
          dni: "55555555",
          nombre: "Otro",
          apellido: "Test",
          password: "password123",
        });
      expect(sinPermiso.statusCode).toBe(403);
    });

    it("Debe listar empleados (admin + recepcionistas) y ver detalle por email (HU74)", async () => {
      const lista = await request(app)
        .get("/api/empleados")
        .set("Authorization", `Bearer ${adminToken}`);
      
      console.log("=== LISTADO DE EMPLEADOS ===", JSON.stringify(lista.body, null, 2));
      
      expect(lista.statusCode).toBe(200);
      expect(lista.body.every((e) => ["ADMIN", "RECEPCIONISTA"].includes(e.rol.nombre))).toBe(true);
      expect(lista.body.some((e) => e.email === "recep@test.com")).toBe(true);
      expect(lista.body.some((e) => e.email === clienteEmail)).toBe(false);

      const detalle = await request(app)
        .get("/api/empleados/recep@test.com")
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== DETALLE EMPLEADO ===", JSON.stringify(detalle.body, null, 2));
      expect(detalle.statusCode).toBe(200);
      expect(detalle.body.email).toBe("recep@test.com");
      expect(detalle.body.rol.nombre).toBe("RECEPCIONISTA");

      const noEmpleado = await request(app)
        .get(`/api/empleados/${clienteEmail}`)
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== NO EMPLEADO (404) ===", JSON.stringify(noEmpleado.body, null, 2));
      expect(noEmpleado.statusCode).toBe(404);

      const filtrado = await request(app)
        .get("/api/empleados?rol=RECEPCIONISTA")
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== EMPLEADOS FILTRADOS ===", JSON.stringify(filtrado.body, null, 2));
      expect(filtrado.statusCode).toBe(200);
      expect(filtrado.body.every((e) => e.rol.nombre === "RECEPCIONISTA")).toBe(true);

      const sinPermiso = await request(app)
        .get("/api/empleados")
        .set("Authorization", `Bearer ${clienteToken}`);
      console.log("=== SIN PERMISO (403) ===", JSON.stringify(sinPermiso.body, null, 2));
      expect(sinPermiso.statusCode).toBe(403);
    });

    it("Debe filtrar usuarios por rol, estado activo y búsqueda libre (HU86)", async () => {
      const todos = await request(app)
        .get("/api/usuarios")
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== TODOS LOS USUARIOS ===", JSON.stringify(todos.body, null, 2));
      expect(todos.statusCode).toBe(200);
      expect(todos.body.length).toBeGreaterThanOrEqual(2);

      const soloClientes = await request(app)
        .get("/api/usuarios?rol=CLIENTE")
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== SOLO CLIENTES ===", JSON.stringify(soloClientes.body, null, 2));
      expect(soloClientes.statusCode).toBe(200);
      expect(soloClientes.body.every((u) => u.rol.nombre === "CLIENTE")).toBe(true);

      const soloActivos = await request(app)
        .get("/api/usuarios?activo=true")
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== SOLO ACTIVOS ===", JSON.stringify(soloActivos.body, null, 2));
      expect(soloActivos.statusCode).toBe(200);
      expect(soloActivos.body.every((u) => u.activo === true)).toBe(true);

      const buscado = await request(app)
        .get("/api/usuarios?q=cliente@test")
        .set("Authorization", `Bearer ${adminToken}`);
      console.log("=== BUSCADO POR Q ===", JSON.stringify(buscado.body, null, 2));
      expect(buscado.statusCode).toBe(200);
      expect(buscado.body.some((u) => u.email === clienteEmail)).toBe(true);
    });

    it("Debe cambiar la contraseña del cliente cuando la actual es correcta", async () => {
      const malActual = await request(app)
        .post("/api/auth/cambiar-password")
        .set("Authorization", `Bearer ${clienteToken}`)
        .send({
          passwordActual: "passwordEquivocada",
          passwordNueva: "passwordNueva1",
          confirmPassword: "passwordNueva1",
        });
      expect(malActual.statusCode).toBe(400);

      const corto = await request(app)
        .post("/api/auth/cambiar-password")
        .set("Authorization", `Bearer ${clienteToken}`)
        .send({
          passwordActual: "password123",
          passwordNueva: "corto1",
          confirmPassword: "corto1",
        });
      expect(corto.statusCode).toBe(400);

      const ok = await request(app)
        .post("/api/auth/cambiar-password")
        .set("Authorization", `Bearer ${clienteToken}`)
        .send({
          passwordActual: "password123",
          passwordNueva: "passwordNueva1",
          confirmPassword: "passwordNueva1",
        });
      expect(ok.statusCode).toBe(200);

      const loginNuevo = await request(app).post("/api/auth/login").send({
        email: clienteEmail,
        password: "passwordNueva1",
      });
      expect(loginNuevo.statusCode).toBe(200);
      clienteToken = loginNuevo.body.token;
    });
  });

  describe("1.5. Catálogo (Actividades)", () => {
    it("Debe permitir al Administrador crear una Actividad, validando su nombre único", async () => {
      const res = await request(app)
        .post("/api/actividades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nombre: "Crossfit",
          descripcion: "Entrenamiento funcional",
          precio: 10000,
          activa: true,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.actividad.nombre).toBe("Crossfit");
      
      actividadId = res.body.actividad.id;

      const duplicado = await request(app)
        .post("/api/actividades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nombre: "Crossfit",
          precio: 12000,
        });
      expect(duplicado.statusCode).toBe(409);
    });

    it("Debe listar las actividades públicas para un cliente", async () => {
      const res = await request(app)
        .get("/api/actividades")
        .set("Authorization", `Bearer ${clienteToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("Debe permitir actualizar el precio (HU89) y dar de baja lógica (HU59)", async () => {
      // Creamos una actividad temporal para dar de baja
      const temp = await request(app)
        .post("/api/actividades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ nombre: "Temporal", precio: 100 });
      const tempId = temp.body.actividad.id;

      // Actualizar precio
      const patchRes = await request(app)
        .patch(`/api/actividades/${tempId}/precio`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ precio: 200 });
      expect(patchRes.statusCode).toBe(200);
      expect(Number(patchRes.body.actividad.precio)).toBe(200);

      // Baja lógica
      const delRes = await request(app)
        .delete(`/api/actividades/${tempId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(delRes.statusCode).toBe(200);
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

    it("Debe devolver el detalle de la clase y sus próximas fechas (HU79), permitiendo cancelar una fecha (HU63)", async () => {
      const res = await request(app)
        .get(`/api/clases/${claseId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.proximas_fechas).toBeDefined();
      expect(res.body.proximas_fechas.length).toBeGreaterThan(0);
      
      const primerFecha = res.body.proximas_fechas[0];

      const cancel = await request(app)
        .post(`/api/clases/${claseId}/cancelaciones`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fecha: primerFecha,
          motivo: "Feriado",
        });
      expect(cancel.statusCode).toBe(201);
      
      const resPostCancel = await request(app)
        .get(`/api/clases/${claseId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(resPostCancel.body.proximas_fechas).not.toContain(primerFecha);
    });

    it("Debe permitir dar de baja una clase si no tiene inscriptos (HU44)", async () => {
      const tempClase = await request(app)
        .post("/api/clases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nombre: "Clase para borrar",
          dia_semana: "Martes",
          hora_inicio: "15:00:00",
          hora_fin: "16:00:00",
          cupo: 10,
          activa: true,
          actividad_id: actividadId,
          sala_id: salaId,
          profesor_id: profesorId,
        });
      const tempClaseId = tempClase.body.clase.id;

      const deleteOk = await request(app)
        .delete(`/api/clases/${tempClaseId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteOk.statusCode).toBe(200);
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

  describe("5. Borrado con inscriptos (Validación estricta)", () => {
    it("Debe rechazar la eliminación de la Clase porque tiene inscripciones vigentes (HU44)", async () => {
      const res = await request(app)
        .delete(`/api/clases/${claseId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(409);
    });

    it("Debe rechazar la eliminación de la Actividad porque tiene clases con inscripciones (HU59)", async () => {
      const res = await request(app)
        .delete(`/api/actividades/${actividadId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(409);
    });
  });
});

