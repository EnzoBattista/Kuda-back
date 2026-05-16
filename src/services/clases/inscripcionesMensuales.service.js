const { InscripcionMensual, Clase, ReservaClase, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { generarReservasMensual } = require("./reservas.service");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

const validarInscripcionMensual = (data) => {
  if (data.estado !== undefined && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de inscripción no válido");
  }
  if (data.periodo_inicio && data.periodo_fin && data.periodo_fin <= data.periodo_inicio) {
    throw httpError(400, "periodo_fin debe ser posterior a periodo_inicio");
  }
};

const crearInscripcionMensual = async (data) => {
  validarInscripcionMensual(data);

  return conn.transaction(async (transaction) => {
    const clase = await Clase.findByPk(data.clase_id, { transaction });
    if (!clase) {
      throw httpError(404, "Clase no encontrada");
    }

    const inscripcion = await InscripcionMensual.create(data, { transaction });
    await generarReservasMensual(inscripcion, clase, { transaction });

    return InscripcionMensual.findByPk(inscripcion.id, {
      include: [{ model: ReservaClase, as: "reservas" }],
      transaction,
    });
  });
};

const actualizarInscripcionMensual = async (inscripcion, data) => {
  validarInscripcionMensual(data);
  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
};
