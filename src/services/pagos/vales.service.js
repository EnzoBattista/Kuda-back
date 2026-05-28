const { Vale } = require("../../../db");
const httpError = require("../../utils/httpError");

const TIPOS_INSCRIPCION = ["MENSUAL", "INDIVIDUAL"];

/**
 * Aplica un cupón a un monto base si corresponde:
 *  - El cupón debe pertenecer al cliente.
 *  - Tiene que estar vigente (hoy entre valido_desde y valido_hasta).
 *  - Tiene que estar atado a la misma clase (vale.clase_id === claseId).
 *  - No tiene que haber sido usado previamente.
 *  - SOLO se permite aplicarlo a inscripciones MENSUAL (regla de negocio:
 *    el cupón es para descuento del pago de la mensualidad del mes siguiente;
 *    no se puede usar en clases individuales).
 *
 * Si todo OK, marca el cupón como usado y devuelve el monto final con
 * descuento. Si vale_id es undefined/null, no hace nada.
 */
const aplicarVale = async ({
  vale_id,
  cliente_email,
  clase_id,
  monto_base,
  inscripcion_id = null,
  tipo_inscripcion,
  transaction,
}) => {
  if (!vale_id) {
    return { monto_final: Number(monto_base), vale: null, descuento: 0 };
  }
  if (tipo_inscripcion && !TIPOS_INSCRIPCION.includes(tipo_inscripcion)) {
    throw httpError(400, "Tipo de inscripción inválido para aplicar cupón");
  }

  const vale = await Vale.findByPk(vale_id, { transaction });
  if (!vale) throw httpError(404, "El cupón indicado no existe");
  if (vale.cliente_email !== cliente_email) {
    throw httpError(403, "El cupón no pertenece al cliente");
  }
  if (vale.usado_en_pago_id != null) {
    throw httpError(409, "El cupón ya fue utilizado");
  }
  if (vale.clase_id != null && vale.clase_id !== clase_id) {
    throw httpError(409, "El cupón solo puede aplicarse a la clase original");
  }
  // El tipo del cupón tiene que coincidir con el tipo de inscripción que se
  // está creando. Cupón MENSUAL solo aplica a inscripción mensual; cupón
  // INDIVIDUAL solo aplica a inscripción individual.
  if (tipo_inscripcion && vale.tipo && vale.tipo !== tipo_inscripcion) {
    throw httpError(
      409,
      vale.tipo === "MENSUAL"
        ? "Este cupón solo puede usarse para el pago de la mensualidad"
        : "Este cupón solo puede usarse para una inscripción individual de esta clase"
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  if (hoy < String(vale.valido_desde) || hoy > String(vale.valido_hasta)) {
    throw httpError(409, "El cupón no está vigente en la fecha actual");
  }

  const montoBase = Number(monto_base);
  const montoVale = Number(vale.monto);
  const descuento = Math.min(montoBase, montoVale);
  const montoFinal = Number((montoBase - descuento).toFixed(2));

  await vale.update(
    { usado_en_pago_id: inscripcion_id ?? vale.id },
    { transaction }
  );

  return { monto_final: montoFinal, vale, descuento };
};

module.exports = {
  aplicarVale,
};
