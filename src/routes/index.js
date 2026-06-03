const express = require("express");
const router = express.Router();

const authRouter = require("./auth/auth.routes");
const usuariosRouter = require("./usuarios/usuarios.routes");
const recepcionistasRouter = require("./usuarios/recepcionistas.routes");
const administrativosRouter = require("./usuarios/administrativos.routes");
const clientesRouter = require("./clientes/clientes.routes");
const profesoresRouter = require("./catalogo/profesores.routes");
const actividadesRouter = require("./catalogo/actividades.routes");
const salasRouter = require("./catalogo/salas.routes");
const clasesRouter = require("./clases/clases.routes");
const inscripcionesMensualesRouter = require("./clases/inscripcionesMensuales.routes");
const inscripcionesIndividualesRouter = require("./clases/inscripcionesIndividuales.routes");
const pagosRouter = require("./pagos/pagos.routes");
const reservasRouter = require("./clases/reservas.routes");
const listaEsperaRouter = require("./clases/listaEspera.routes");
const cronRouter = require("./cron.routes");
const reportesRouter = require("./reportes/reportes.routes");
const notificacionesRouter = require("./notificaciones/notificaciones.routes");
const asistenciasRouter = require("./asistencias/asistencias.routes");

router.get("/", (_req, res) => {
  res.json({
    message: "API de Gimnasio",
    endpoints: {
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      recepcionistas: "/api/recepcionistas",
      administrativos: "/api/administrativos",
      clientes: "/api/clientes",
      profesores: "/api/profesores",
      actividades: "/api/actividades",
      clases: "/api/clases",
      inscripcionesMensuales: "/api/inscripciones-mensuales",
      inscripcionesIndividuales: "/api/inscripciones-individuales",
      pagos: "/api/pagos",
      reservas: "/api/reservas",
      listaEspera: "/api/lista-espera",
      reportes: "/api/reportes",
      asistencias: "/api/asistencias",
    },
  });
});

router.use("/api/auth", authRouter);
router.use("/api/usuarios", usuariosRouter);
router.use("/api/recepcionistas", recepcionistasRouter);
router.use("/api/administrativos", administrativosRouter);
router.use("/api/clientes", clientesRouter);
router.use("/api/profesores", profesoresRouter);
router.use("/api/actividades", actividadesRouter);
router.use("/api/salas", salasRouter);
router.use("/api/clases", clasesRouter);
router.use("/api/inscripciones-mensuales", inscripcionesMensualesRouter);
router.use("/api/inscripciones-individuales", inscripcionesIndividualesRouter);
router.use("/api/pagos", pagosRouter);
router.use("/api/reservas", reservasRouter);
router.use("/api/lista-espera", listaEsperaRouter);
router.use("/api/cron", cronRouter);
router.use("/api/reportes", reportesRouter);
router.use("/api/notificaciones", notificacionesRouter);
router.use("/api/asistencias", asistenciasRouter);

module.exports = router;
