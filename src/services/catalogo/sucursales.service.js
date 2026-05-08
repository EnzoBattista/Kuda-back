const { Sucursal } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarSucursal = (data) => {
  if (data.localidad !== undefined && !data.localidad.trim()) {
    throw httpError(400, "La localidad no puede estar vacía");
  }
  if (data.direccion !== undefined && !data.direccion.trim()) {
    throw httpError(400, "La dirección no puede estar vacía");
  }
  if (data.telefono !== undefined) {
    if (!data.telefono.trim()) throw httpError(400, "El teléfono no puede estar vacío");
    if (!/^[0-9+\- ]+$/.test(data.telefono)) {
      throw httpError(400, "El teléfono solo puede contener números, +, - o espacios");
    }
  }
};

const crearSucursal = async (data) => {
  validarSucursal(data);
  return Sucursal.create(data);
};

const actualizarSucursal = async (sucursal, data) => {
  validarSucursal(data);
  return sucursal.update(data);
};

module.exports = {
  validarSucursal,
  crearSucursal,
  actualizarSucursal,
};
