const { Socio } = require("../../db");

const getAllSocios = async (_req, res, next) => {
  try {
    const socios = await Socio.findAll();
    return res.status(200).json(socios);
  } catch (error) {
    return next(error);
  }
};

const createSocio = async (req, res, next) => {
  try {
    const { nombre, email, telefono } = req.body;
    const socio = await Socio.create({
      nombre,
      email,
      telefono,
      estado_activo: true,
    });
    return res.status(201).json(socio);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllSocios,
  createSocio,
};
