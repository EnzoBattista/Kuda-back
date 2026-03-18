const express = require("express");
const {
  getAllPlanes,
  createPlan,
} = require("../controllers/planes.controller");

const router = express.Router();

router.get("/", getAllPlanes);
router.post("/", createPlan);

module.exports = router;
