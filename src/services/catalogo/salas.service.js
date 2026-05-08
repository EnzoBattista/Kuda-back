const { Sala } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarSala = (data) => {
  if (data.identificador !== undefined && !data.identificador.trim()) {
    throw httpError(400, "El identificador de la sala no puede estar vacío");
  }
  if (data.cupo !== undefined && data.cupo < 10) {
    throw httpError(400, "El cupo de la sala debe ser de al menos 10 personas");
  }
};

const crearSala = async (data) => {
  validarSala(data);
  return Sala.create(data);
};

const actualizarSala = async (sala, data) => {
  validarSala(data);
  return sala.update(data);
};

module.exports = {
  validarSala,
  crearSala,
  actualizarSala,
};
