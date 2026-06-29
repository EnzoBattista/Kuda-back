const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const { ValidationError, DatabaseError, UniqueConstraintError } = require("sequelize");
const routes = require("./src/routes/index.js");

require("./db.js");

const server = express();

server.name = "API";

// La API devuelve datos dinámicos: desactivamos el ETag de Express para evitar
// respuestas 304 (sin cuerpo) que dejan al front esperando datos que nunca llegan.
server.disable("etag");
server.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

server.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
server.use(bodyParser.json({ limit: "50mb" }));
server.use(cookieParser());
server.use(morgan("dev"));
const allowedOrigins = ["http://localhost:4200", "https://localhost:4201", "http://localhost:4201"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

/** Orígenes LAN/HTTPS del dev server (PC, celu por hotspot, red facultad). */
const isLanDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|163\.10\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
    origin,
  );

server.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isLanDevOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

server.use("/", routes);

// Error catching endware.
server.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      message: "Recurso duplicado",
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({
      message: "Error de validación",
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }
  if (err instanceof DatabaseError) {
    return res.status(400).json({ message: err.message });
  }
  const status = err.status || 500;
  const message = err.message || err;
  console.error(err);
  res.status(status).json({ message });
});

module.exports = server;
