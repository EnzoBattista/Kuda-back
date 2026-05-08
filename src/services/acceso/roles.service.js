const { Rol } = require("../../../db");
const httpError = require("../../utils/httpError");
const { ROLES_LIST } = require("../../constants/roles");

const validarRol = (data) => {
  if (data.nombre !== undefined) {
    if (!ROLES_LIST.includes(data.nombre)) {
      throw httpError(400, "Rol no válido");
    }
  }
};

const crearRol = async (data) => {
  validarRol(data);
  return Rol.create(data);
};

const actualizarRol = async (rol, data) => {
  validarRol(data);
  return rol.update(data);
};

module.exports = {
  validarRol,
  crearRol,
  actualizarRol,
};
