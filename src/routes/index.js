const express = require("express");
const router = express.Router();

const authRouter = require("./auth/auth.routes");
const usuariosRouter = require("./usuarios/usuarios.routes");
const recepcionistasRouter = require("./usuarios/recepcionistas.routes");
const empleadosRouter = require("./usuarios/empleados.routes");
const clientesRouter = require("./clientes/clientes.routes");
const profesoresRouter = require("./catalogo/profesores.routes");
const actividadesRouter = require("./catalogo/actividades.routes");
const clasesRouter = require("./clases/clases.routes");
const inscripcionesMensualesRouter = require("./clases/inscripcionesMensuales.routes");
const inscripcionesIndividualesRouter = require("./clases/inscripcionesIndividuales.routes");
const pagosRouter = require("./pagos/pagos.routes");

router.get("/", (_req, res) => {
  res.json({
    message: "API de Gimnasio",
    endpoints: {
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      recepcionistas: "/api/recepcionistas",
      empleados: "/api/empleados",
      clientes: "/api/clientes",
      profesores: "/api/profesores",
      actividades: "/api/actividades",
      clases: "/api/clases",
      inscripcionesMensuales: "/api/inscripciones-mensuales",
      inscripcionesIndividuales: "/api/inscripciones-individuales",
      pagos: "/api/pagos",
    },
  });
});

router.use("/api/auth", authRouter);
router.use("/api/usuarios", usuariosRouter);
router.use("/api/recepcionistas", recepcionistasRouter);
router.use("/api/empleados", empleadosRouter);
router.use("/api/clientes", clientesRouter);
router.use("/api/profesores", profesoresRouter);
router.use("/api/actividades", actividadesRouter);
router.use("/api/clases", clasesRouter);
router.use("/api/inscripciones-mensuales", inscripcionesMensualesRouter);
router.use("/api/inscripciones-individuales", inscripcionesIndividualesRouter);
router.use("/api/pagos", pagosRouter);

module.exports = router;
