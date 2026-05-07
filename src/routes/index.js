const express = require("express");
const router = express.Router();

const planesRouter = require("./planes.routes");
const pagosRouter = require("./pagos.routes");
const usuariosRouter = require("./usuarios.routes");
const authRouter = require("./auth.routes");
const clasesRouter = require("./clases.routes");
const profesoresRouter = require("./profesores.routes");
const mensualidadesRouter = require("./mensualidades.routes");
const clasesIndividualesRouter = require("./clasesIndividuales.routes");

router.get("/", (req, res) => {
  res.json({
    message: "API de Gimnasio",
    endpoints: {
      auth: "/api/auth",
      planes: "/api/planes",
      pagos: "/api/pagos",
      usuarios: "/api/usuarios",
      clases: "/api/clases",
      profesores: "/api/profesores",
      mensualidades: "/api/mensualidades",
      clasesIndividuales: "/api/clases-individuales",
    },
  });
});

router.use("/api/auth", authRouter);
router.use("/api/planes", planesRouter);
router.use("/api/pagos", pagosRouter);
router.use("/api/usuarios", usuariosRouter);
router.use("/api/clases", clasesRouter);
router.use("/api/profesores", profesoresRouter);
router.use("/api/mensualidades", mensualidadesRouter);
router.use("/api/clases-individuales", clasesIndividualesRouter);

module.exports = router;
