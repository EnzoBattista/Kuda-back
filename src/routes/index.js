const express = require("express");
const router = express.Router();

const authRouter = require("./auth/auth.routes");
const usuariosRouter = require("./usuarios/usuarios.routes");
const planesRouter = require("./catalogo/planes.routes");
const profesoresRouter = require("./catalogo/profesores.routes");
const clasesRouter = require("./clases/clases.routes");
const mensualidadesRouter = require("./clases/mensualidades.routes");
const clasesIndividualesRouter = require("./clases/clasesIndividuales.routes");
const pagosRouter = require("./pagos/pagos.routes");

router.get("/", (_req, res) => {
  res.json({
    message: "API de Gimnasio",
    endpoints: {
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      planes: "/api/planes",
      profesores: "/api/profesores",
      clases: "/api/clases",
      mensualidades: "/api/mensualidades",
      clasesIndividuales: "/api/clases-individuales",
      pagos: "/api/pagos",
    },
  });
});

router.use("/api/auth", authRouter);
router.use("/api/usuarios", usuariosRouter);
router.use("/api/planes", planesRouter);
router.use("/api/profesores", profesoresRouter);
router.use("/api/clases", clasesRouter);
router.use("/api/mensualidades", mensualidadesRouter);
router.use("/api/clases-individuales", clasesIndividualesRouter);
router.use("/api/pagos", pagosRouter);

module.exports = router;
