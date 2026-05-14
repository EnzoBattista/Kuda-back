process.env.JWT_SECRET = "supersecret123";
process.env.SENDGRID_API_KEY = "SG.fake-key-for-tests";
process.env.EMAIL_FROM = "no-reply@kuda.test";
process.env.APP_URL = "http://localhost:3001";

jest.mock("@sendgrid/mail", () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockRejectedValue(new Error("Forbidden: SendGrid 403")),
}));

require("dotenv").config();
const request = require("supertest");
const app = require("../app");
const { conn } = require("../db");
const seedRoles = require("../seeders/20260505000000-roles-permisos");

beforeAll(async () => {
  await conn.sync({ force: true });
  await seedRoles.up(conn.getQueryInterface());
});

afterAll(async () => {
  await conn.close();
});

describe("POST /api/auth/register — robustez frente a fallas de SMTP", () => {
  const payload = {
    nombre: "Enzito",
    apellido: "Battista",
    dni: "4569789",
    email: "enzobat07@hotmail.com",
    genero: "Masculino",
    fechaNacimiento: "2003-06-19",
    telefono: "2215369875",
    fichaMedica: null,
    password: "password1",
    confirmPassword: "password1",
  };

  it("devuelve 503 con mensaje genérico si el envío de email falla, sin exponer el error de SMTP", async () => {
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toMatch(/email/i);
    expect(res.body.message).not.toMatch(/535/);
    expect(res.body.message).not.toMatch(/Invalid login/i);
  });

  it("revierte la creación de Usuario y Cliente (rollback transaccional) cuando falla SMTP", async () => {
    const usuario = await conn.models.Usuario.findOne({ where: { email: payload.email } });
    const cliente = await conn.models.Cliente.findOne({ where: { usuario_email: payload.email } });

    expect(usuario).toBeNull();
    expect(cliente).toBeNull();
  });

  it("permite reintentar el registro con el mismo email tras el fallo (la BD quedó limpia)", async () => {
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.statusCode).toBe(503);
    expect(res.body.message).not.toMatch(/ya se encuentra registrado/i);
  });
});
