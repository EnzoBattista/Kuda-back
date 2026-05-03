const express = require("express");
const router = express.Router();

const sociosRouter = require("./socios.routes");
const planesRouter = require("./planes.routes");
const pagosRouter = require("./pagos.routes");
const usuariosRouter = require("./usuarios.routes");
const authRouter = require("./auth.routes");
const clasesRouter = require("./clases.routes");

router.get("/", (req, res) => {
  res.json({
    message: "API de Gimnasio",
    endpoints: {
      auth: "/api/auth",
      socios: "/api/socios",
      planes: "/api/planes",
      pagos: "/api/pagos",
      usuarios: "/api/usuarios",
      clases: "/api/clases",
    },
  });
});

router.use("/api/auth", authRouter);
router.use("/api/socios", sociosRouter);
router.use("/api/planes", planesRouter);
router.use("/api/pagos", pagosRouter);
router.use("/api/usuarios", usuariosRouter);
router.use("/api/clases", clasesRouter);

module.exports = router;
