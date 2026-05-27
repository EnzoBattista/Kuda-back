const { Op } = require("sequelize");
const { InscripcionIndividual, InscripcionMensual, Clase, ReservaClase, conn } = require("../../../db");
const httpError = require("../../utils/httpError");
const { generarReservasIndividual } = require("./reservas.service");

const MODALIDADES = ["COMPLETO", "SEÑA"];
const ESTADOS_SEÑA = ["PENDIENTE", "COMPLETADA", "VENCIDA"];

const validarInscripcionIndividual = (data) => {
  if (data.modalidad !== undefined) {
    if (!MODALIDADES.includes(data.modalidad)) {
      throw httpError(400, "Modalidad no válida");
    }
    if (data.modalidad === "SEÑA") {
      if (!data.estado_seña || !data.vencimiento_seña) {
        throw httpError(400, "Una seña requiere estado_seña y vencimiento_seña");
      }
    } else if (data.modalidad === "COMPLETO") {
      if (data.estado_seña || data.vencimiento_seña) {
        throw httpError(400, "Pago COMPLETO no debe tener datos de seña");
      }
    }
  }

  if (data.estado_seña !== undefined && data.estado_seña !== null) {
    if (!ESTADOS_SEÑA.includes(data.estado_seña)) {
      throw httpError(400, "Estado de seña no válido");
    }
  }
};

/**
 * Crea la InscripcionIndividual y genera automáticamente la
 * ReservaClase concreta para la fecha de la clase, usando transacciones.
 */
const crearInscripcionIndividual = async (data) => {
  validarInscripcionIndividual(data);

  return conn.transaction(async (transaction) => {
    const clase = await Clase.findByPk(data.clase_id, { transaction });
    if (!clase) {
      throw httpError(404, "Clase no encontrada");
    }

    const fecha = String(data.fecha).slice(0, 10);
    const abonoActivo = await InscripcionMensual.findOne({
      where: {
        cliente_email: data.cliente_email,
        actividad_id: data.actividad_id,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] },
        periodo_inicio: { [Op.lte]: fecha },
        periodo_fin: { [Op.gt]: fecha },
      },
      transaction,
    });
    if (abonoActivo) {
      throw httpError(
        409,
        "Ya tenés un abono activo en esta actividad, no podés reservar individualmente esta clase",
      );
    }

    const inscripcion = await InscripcionIndividual.create(data, { transaction });
    await generarReservasIndividual(inscripcion, clase, { transaction });

    return InscripcionIndividual.findByPk(inscripcion.id, {
      include: [{ model: ReservaClase, as: "reservas" }],
      transaction,
    });
  });
};

const actualizarInscripcionIndividual = async (inscripcion, data) => {
  validarInscripcionIndividual(data);
  return conn.transaction(async (transaction) => {
    return inscripcion.update(data, { transaction });
  });
};

module.exports = {
  validarInscripcionIndividual,
  crearInscripcionIndividual,
  actualizarInscripcionIndividual,
};
