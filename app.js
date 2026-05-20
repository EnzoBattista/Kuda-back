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

server.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
server.use(bodyParser.json({ limit: "50mb" }));
server.use(cookieParser());
server.use(morgan("dev"));
const allowedOrigins = ["http://localhost:4200"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

server.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
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
