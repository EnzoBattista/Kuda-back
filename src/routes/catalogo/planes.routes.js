const express = require("express");
const { getAllPlanes } = require("../../controllers/catalogo/planes.controller");

const router = express.Router();

router.get("/", getAllPlanes);

module.exports = router;
