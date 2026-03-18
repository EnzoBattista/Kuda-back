const express = require("express");
const router = express.Router();

const sociosRouter = require("./socios.routes");
const planesRouter = require("./planes.routes");
const pagosRouter = require("./pagos.routes");

router.get("/", (req, res) => {
  res.json({
    message: "API de Gimnasio",
    endpoints: {
      socios: "/api/socios",
      planes: "/api/planes",
      pagos: "/api/pagos",
    },
  });
});

router.use("/api/socios", sociosRouter);
router.use("/api/planes", planesRouter);
router.use("/api/pagos", pagosRouter);

module.exports = router;
