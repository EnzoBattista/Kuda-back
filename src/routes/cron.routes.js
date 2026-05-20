const { Router } = require("express");
const { verificarListaEspera } = require("../controllers/cron/cron.controller");

const router = Router();

router.get("/verificar-lista-espera", verificarListaEspera);

module.exports = router;
