const { InscripcionMensual, Clase } = require("../../../db");
const httpError = require("../../utils/httpError");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

const validarInscripcionMensual = async (data, inscripcionIdActual = null) => {
  if (data.estado !== undefined && !ESTADOS.includes(data.estado)) {
    throw httpError(400, "Estado de inscripción no válido");
  }
  if (data.periodo_inicio && data.periodo_fin && data.periodo_fin <= data.periodo_inicio) {
    throw httpError(400, "periodo_fin debe ser posterior a periodo_inicio");
  }
  const whereInscripcion = {
    cliente_email: data.cliente_email,
    actividad_id: data.actividad_id,
    estado: "VIGENTE"
  };

  if (inscripcionIdActual) {
    whereInscripcion.id = { [Op.ne]: inscripcionIdActual };
  }

  const inscripcionVigente = await InscripcionMensual.findOne({ where: whereInscripcion });

  if (inscripcionVigente) {
    throw httpError(400, "El cliente ya tiene otra inscripción mensual vigente para esta actividad");
  }
  const clase = await Clase.findByPk(data.clase_id);
  if (!clase.activa) {
    throw httpError(400, "La clase seleccionada se encuentra inactiva o dada de baja");
  }
  const ocupacionActual = await InscripcionMensual.count({
    where: {
      clase_id: data.clase_id,
      estado: ["VIGENTE", "EN_GRACIA"]
    }
  });

  if (ocupacionActual >= clase.cupo) {
    throw httpError(400, "No hay cupo disponible para esta clase");
  }
};

const crearInscripcionMensual = async (data) => {
  await validarInscripcionMensual(data);
  return InscripcionMensual.create(data);
};

const actualizarInscripcionMensual = async (inscripcion, data) => {
  await validarInscripcionMensual(data, inscripcion.id);
  return inscripcion.update(data);
};

module.exports = {
  validarInscripcionMensual,
  crearInscripcionMensual,
  actualizarInscripcionMensual,
};
