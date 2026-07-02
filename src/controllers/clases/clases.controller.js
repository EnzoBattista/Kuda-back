const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor } = require("../../../db");
const clasesService = require("../../services/clases/clases.service");

const getAllClases = async (_req, res, next) => {
  try {
    const clases = await Clase.findAll({
      where: { activa: true },
      include: [
        { model: Actividad, as: "actividad" },
        { model: Sala, as: "sala" },
        { model: Profesor, as: "profesor" },
      ],
      order: [
        ["dia_semana", "ASC"],
        ["hora_inicio", "ASC"],
      ],
    });
    if (clases.length === 0) {
      return res.status(200).json({ message: "No existen clases para mostrar.", data: [] });
    }
    return res.status(200).json(clases);
  } catch (error) {
    return next(error);
  }
};

const createClase = async (req, res, next) => {
  try {
    const data = req.body;
    const clase = await clasesService.crearClase(data);

    return res.status(201).json({
      message: "Clase agregada con éxito",
      clase,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const updateClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const { clase, huboEspera } = await clasesService.modificarClase(id, data);

    return res.status(200).json({
      message: "Clase modificada con éxito",
      clase,
      huboEspera,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const getClaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const clase = await clasesService.getClaseById(id);
    return res.status(200).json(clase);
  } catch (error) {
    return next(error);
  }
};

const deleteClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await clasesService.deleteClase(id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const cancelarFechaClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body; // { fecha, motivo }

    const resultado = await clasesService.cancelarFechaClase(id, data);

    const message = resultado.reservasCanceladas > 0
      ? "La clase fue cancelada exitosamente. Se le reintegrara a cada cliente afectado la clase correspondiente"
      : "La clase fue cancelada exitosamente";

    return res.status(201).json({
      message,
      cancelacion: resultado.cancelacion,
      reservasCanceladas: resultado.reservasCanceladas,
      valesGenerados: resultado.valesGenerados,
    });
  } catch (error) {
    return next(error);
  }
};

const checkConflicto = async (req, res, next) => {
  try {
    const claseId = Number(req.params.id);
    const { fecha, cliente_email, tipo } = req.query;

    if (!cliente_email) {
      return res.status(400).json({ message: "Se requiere el parámetro cliente_email" });
    }

    let resultado;
    if (tipo === "MENSUAL") {
      resultado = await clasesService.verificarConflictoMensual(claseId, cliente_email);
    } else {
      if (!fecha) {
        return res.status(400).json({ message: "Se requiere el parámetro fecha para reservas individuales" });
      }
      resultado = await clasesService.verificarConflictoReserva(claseId, fecha, cliente_email);
    }
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

const getInscriptosClase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { InscripcionMensual, InscripcionIndividual, Cliente, Usuario } = require("../../../db");
    const { Op } = require("sequelize");

    const mensuales = await InscripcionMensual.findAll({
      where: {
        clase_id: id,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA", "PENDIENTE_PAGO"] }
      },
      include: [
        {
          model: Cliente,
          as: "cliente",
          include: [{ model: Usuario, as: "usuario" }]
        }
      ]
    });

    const individuales = await InscripcionIndividual.findAll({
      where: {
        clase_id: id,
        [Op.or]: [
          { modalidad: "COMPLETO" },
          { modalidad: "SEÑA", estado_seña: { [Op.in]: ["PENDIENTE", "COMPLETADA"] } }
        ]
      },
      include: [
        {
          model: Cliente,
          as: "cliente",
          include: [{ model: Usuario, as: "usuario" }]
        }
      ]
    });

    const mappedMensuales = mensuales.map((item) => {
      const plain = item.toJSON();
      if (plain.cliente && plain.cliente.usuario) {
        plain.cliente.nombre = plain.cliente.usuario.nombre;
        plain.cliente.apellido = plain.cliente.usuario.apellido;
        plain.cliente.email = plain.cliente.usuario.email;
        plain.cliente.telefono = plain.cliente.usuario.telefono;
      }
      plain.tipo = "Mensual";
      return plain;
    });

    const mappedIndividuales = individuales.map((item) => {
      const plain = item.toJSON();
      if (plain.cliente && plain.cliente.usuario) {
        plain.cliente.nombre = plain.cliente.usuario.nombre;
        plain.cliente.apellido = plain.cliente.usuario.apellido;
        plain.cliente.email = plain.cliente.usuario.email;
        plain.cliente.telefono = plain.cliente.usuario.telefono;
      }
      plain.tipo = "Individual";
      return plain;
    });

    const mapped = [...mappedMensuales, ...mappedIndividuales];

    return res.status(200).json(mapped);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllClases,
  createClase,
  updateClase,
  getClaseById,
  deleteClase,
  cancelarFechaClase,
  checkConflicto,
  getInscriptosClase,
};
