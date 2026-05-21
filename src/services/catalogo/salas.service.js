const { Sala, Clase } = require("../../../db");
const { Op } = require("sequelize");
const httpError = require("../../utils/httpError");

const validarSala = (data) => {
  if (data.identificador !== undefined && !data.identificador.trim()) {
    throw httpError(400, "El identificador de la sala no puede estar vacío");
  }
  if (data.cupo !== undefined && data.cupo < 10) {
    throw httpError(400, "El cupo debe ser mayor o igual a 10.");
  }
};

const crearSala = async (data) => {
  validarSala(data);
  if (data.identificador) {
    const salaExistente = await Sala.findOne({ where: { identificador: data.identificador } });
    if (salaExistente) throw httpError(400, "La sala ya se encuentra registrada en el sistema.");
  }
  return Sala.create(data);
};

const actualizarSala = async (sala, data) => {
  validarSala(data);
  
  if (data.identificador && data.identificador !== sala.identificador) {
    const salaExistente = await Sala.findOne({ where: { identificador: data.identificador } });
    if (salaExistente) throw httpError(409, "Ya existe una sala con ese nombre.");
  }

  if (data.cupo !== undefined && data.cupo < sala.cupo) {
    // Validar que el nuevo cupo no sea menor al cupo de las clases ya asignadas
    const maxCupo = await Clase.max("cupo", {
      where: {
        sala_id: sala.id,
        estado: { [Op.notIn]: ["CANCELADA", "FINALIZADA"] }
      }
    });
    
    if (maxCupo && data.cupo < maxCupo) {
      throw httpError(409, `Aun existen clases asignadas a la sala con cupo mayor a ${data.cupo}.`);
    }
  }

  return sala.update(data);
};

const eliminarSala = async (id) => {
  const sala = await Sala.findByPk(id);
  if (!sala) throw httpError(404, "Sala no encontrada");

  // Validar si tiene clases próximas
  const clasesProximas = await Clase.count({
    where: {
      sala_id: sala.id,
      estado: { [Op.notIn]: ["CANCELADA", "FINALIZADA"] },
      fecha: { [Op.gte]: new Date() } // Clases desde hoy en adelante
    }
  });

  if (clasesProximas > 0) {
    throw httpError(409, "La sala aun tiene clases proximas.");
  }

  return sala.update({ estado_activo: false });
};

module.exports = {
  validarSala,
  crearSala,
  actualizarSala,
  eliminarSala
};
