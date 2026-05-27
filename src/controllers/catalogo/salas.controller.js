const { Sala } = require("../../../db");
const salasService = require("../../services/catalogo/salas.service");

const getAllSalas = async (req, res, next) => {
  try {
    const salas = await Sala.findAll();

    return res.status(200).json(salas);
  } catch (error) {
    return next(error);
  }
};

const getSalaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sala = await Sala.findByPk(id);
    if (!sala) {
      return res.status(404).json({ message: "Sala no encontrada" });
    }
    return res.status(200).json(sala);
  } catch (error) {
    return next(error);
  }
};

const createSala = async (req, res, next) => {
  try {
    const nuevaSala = await salasService.crearSala(req.body);
    return res.status(201).json({
      message: "La sala se agregó correctamente.",
      sala: nuevaSala,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const updateSala = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const sala = await Sala.findByPk(id);
    if (!sala) {
      return res.status(404).json({ message: "Sala no encontrada" });
    }
    
    const actualizada = await salasService.actualizarSala(sala, req.body);
    return res.status(200).json({
      message: "La sala se modifico con exito.",
      sala: actualizada,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const deleteSala = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await salasService.eliminarSala(id);
    
    return res.status(200).json({ message: "La sala fue eliminada exitosamente." });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  getAllSalas,
  getSalaById,
  createSala,
  updateSala,
  deleteSala,
};
