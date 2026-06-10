const { Sala, Clase, CancelacionClase, Actividad, Profesor } = require("../../../db");
const { Op } = require("sequelize");
const httpError = require("../../utils/httpError");

const MAPA_DIAS = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
};

const CUPO_MINIMO = 10;

const calcularProximasFechas = (diaSemana, fechasCanceladas = [], cantidad = 4) => {
  const diaObjetivo = MAPA_DIAS[diaSemana];
  if (diaObjetivo === undefined) return [];

  const proximas = [];
  const actual = new Date();

  while (actual.getDay() !== diaObjetivo) {
    actual.setDate(actual.getDate() + 1);
  }

  let generadas = 0;
  let intentos = 0;
  while (generadas < cantidad && intentos < 24) {
    const yyyy = actual.getFullYear();
    const mm = String(actual.getMonth() + 1).padStart(2, "0");
    const dd = String(actual.getDate()).padStart(2, "0");
    const fechaStr = `${yyyy}-${mm}-${dd}`;

    if (!fechasCanceladas.includes(fechaStr)) {
      proximas.push(fechaStr);
      generadas++;
    }
    actual.setDate(actual.getDate() + 7);
    intentos++;
  }

  return proximas;
};

const validarSala = (data) => {
  if (data.identificador !== undefined && !String(data.identificador).trim()) {
    throw httpError(400, "El identificador de la sala no puede estar vacío");
  }
  if (data.cupo !== undefined && Number(data.cupo) < CUPO_MINIMO) {
    throw httpError(400, "El cupo debe ser mayor o igual a 10.");
  }
};

const obtenerClasesActivasSala = async (salaId) =>
  Clase.findAll({
    where: { sala_id: salaId, activa: true },
    include: [
      { model: Actividad, as: "actividad", attributes: ["id", "nombre"] },
      { model: Profesor, as: "profesor", attributes: ["id", "nombre", "apellido"] },
    ],
    order: [["dia_semana", "ASC"], ["hora_inicio", "ASC"]],
  });

const construirClasesProximas = async (salaId) => {
  const clases = await obtenerClasesActivasSala(salaId);
  if (clases.length === 0) return [];

  const claseIds = clases.map((c) => c.id);
  const cancelaciones = await CancelacionClase.findAll({
    where: { clase_id: { [Op.in]: claseIds } },
    attributes: ["clase_id", "fecha"],
  });

  const canceladasPorClase = cancelaciones.reduce((acc, c) => {
    if (!acc[c.clase_id]) acc[c.clase_id] = [];
    acc[c.clase_id].push(c.fecha);
    return acc;
  }, {});

  return clases
    .map((clase) => {
      const proximas_fechas = calcularProximasFechas(
        clase.dia_semana,
        canceladasPorClase[clase.id] || [],
      );
      return {
        id: clase.id,
        nombre: clase.nombre,
        dia_semana: clase.dia_semana,
        hora_inicio: clase.hora_inicio,
        hora_fin: clase.hora_fin,
        cupo: clase.cupo,
        actividad: clase.actividad,
        profesor: clase.profesor,
        proximas_fechas,
      };
    })
    .filter((c) => c.proximas_fechas.length > 0);
};

const salaTieneClasesProximas = async (salaId) => {
  const clasesProximas = await construirClasesProximas(salaId);
  return clasesProximas.length > 0;
};

const listarSalas = async () => {
  const salas = await Sala.findAll({ order: [["identificador", "ASC"]] });
  return salas;
};

const crearSala = async (data) => {
  validarSala(data);

  const identificador = String(data.identificador).trim();
  const salaExistente = await Sala.findOne({ where: { identificador } });
  if (salaExistente) {
    throw httpError(
      400,
      `La sala "${identificador}" ya se encuentra registrada en el sistema.`,
    );
  }

  return Sala.create({
    identificador,
    cupo: Number(data.cupo),
    estado_activo: true,
  });
};

const actualizarSala = async (sala, data) => {
  validarSala(data);

  if (data.identificador !== undefined) {
    const identificador = String(data.identificador).trim();
    if (identificador !== sala.identificador) {
      const salaExistente = await Sala.findOne({ where: { identificador } });
      if (salaExistente) {
        throw httpError(409, "Ya existe una sala con ese nombre.");
      }
      data.identificador = identificador;
    }
  }

  if (data.cupo !== undefined) {
    const nuevoCupo = Number(data.cupo);
    const maxCupo = await Clase.max("cupo", {
      where: { sala_id: sala.id, activa: true },
    });

    if (maxCupo && nuevoCupo < maxCupo) {
      throw httpError(
        409,
        `aun existen clases asignadas a la sala con cupo mayor a ${nuevoCupo}.`,
      );
    }
    data.cupo = nuevoCupo;
  }

  return sala.update(data);
};

const habilitarSala = async (id) => {
  const sala = await Sala.findByPk(id);
  if (!sala) throw httpError(404, "Sala no encontrada");

  if (sala.estado_activo) {
    return sala;
  }

  return sala.update({ estado_activo: true });
};

const deshabilitarSala = async (id) => {
  const sala = await Sala.findByPk(id);
  if (!sala) throw httpError(404, "Sala no encontrada");

  if (await salaTieneClasesProximas(sala.id)) {
    throw httpError(409, "La sala aun tiene clases proximas.");
  }

  if (!sala.estado_activo) {
    return sala;
  }

  return sala.update({ estado_activo: false });
};

const eliminarSala = async (id) => {
  const sala = await Sala.findByPk(id);
  if (!sala) throw httpError(404, "Sala no encontrada");

  if (await salaTieneClasesProximas(sala.id)) {
    throw httpError(409, "La sala aun tiene clases proximas.");
  }

  await sala.destroy();
  return sala;
};

module.exports = {
  validarSala,
  listarSalas,
  crearSala,
  actualizarSala,
  habilitarSala,
  deshabilitarSala,
  eliminarSala,
};
