const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor, CancelacionClase, InscripcionMensual, InscripcionIndividual } = require("../../../db");
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

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

const validarExistenciasYSolapamientos = async (data, excludeClaseId = null, { isModify = false } = {}) => {
  const { nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, sala_id, profesor_id } = data;

  if (nombre !== undefined && !nombre.trim()) {
    throw httpError(400, "El nombre de la clase no puede estar vacío");
  }
  if (dia_semana !== undefined && !DIAS_SEMANA.includes(dia_semana)) {
    throw httpError(400, "Día de la semana no válido");
  }
  if (dia_semana === "Domingo") {
    throw httpError(400, "No se pueden agendar clases los días Domingo");
  }

  if (hora_inicio && hora_fin && hora_fin <= hora_inicio) {
    throw httpError(400, "La hora de fin debe ser posterior a la hora de inicio");
  }

  if (hora_inicio && hora_inicio < "07:00") {
    throw httpError(400, "La clase no puede iniciar antes de las 07:00hs");
  }

  if (hora_fin && hora_fin > "22:00") {
    throw httpError(400, "La clase no puede finalizar después de las 22:00hs");
  }

  if (hora_inicio && hora_fin) {
    const [hI, mI] = hora_inicio.split(":").map(Number);
    const [hF, mF] = hora_fin.split(":").map(Number);
    const diff = (hF * 60 + mF) - (hI * 60 + mI);
    if (diff > 240) {
      throw httpError(400, "La duración de la clase no puede exceder las 4 horas");
    }
  }

  if (cupo !== undefined && cupo < 10) {
    throw httpError(400, isModify
      ? "No se pudo modificar la clase. El cupo debe ser mayor o igual a 10"
      : "El cupo máximo debe ser mayor o igual al cupo mínimo (10)");
  }

  if (actividad_id) {
    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) throw httpError(400, "La actividad indicada no existe");
  }

  if (sala_id) {
    const sala = await Sala.findByPk(sala_id);
    if (!sala) throw httpError(400, "La sala indicada no existe");
    if (!sala.estado_activo) throw httpError(400, "La sala se encuentra deshabilitada");
  }

  if (profesor_id) {
    const profesor = await Profesor.findByPk(profesor_id);
    if (!profesor) throw httpError(400, "El profesor indicado no existe");
  }

  if (sala_id && dia_semana && hora_inicio && hora_fin) {
    const whereSolapada = {
      sala_id,
      dia_semana,
      activa: true,
      hora_inicio: { [Op.lt]: hora_fin },
      hora_fin: { [Op.gt]: hora_inicio },
    };
    if (excludeClaseId) whereSolapada.id = { [Op.ne]: excludeClaseId };

    const solapada = await Clase.findOne({ where: whereSolapada });
    if (solapada) {
      throw httpError(409, isModify
        ? "No se pudo modificar la clase. La sala esta ocupada en el dia y horario seleccionado"
        : "La sala se encuentra ocupada para ese día y horario");
    }
  }

  if (profesor_id && dia_semana && hora_inicio && hora_fin) {
    const whereProfesor = {
      profesor_id,
      dia_semana,
      activa: true,
      hora_inicio: { [Op.lt]: hora_fin },
      hora_fin: { [Op.gt]: hora_inicio },
    };
    if (excludeClaseId) whereProfesor.id = { [Op.ne]: excludeClaseId };

    const claseProfesor = await Clase.findOne({ where: whereProfesor });
    if (claseProfesor) {
      throw httpError(409, isModify
        ? "No se pudo modificar la clase. El profesor ya tiene una clase en el dia y horario seleccionado"
        : "El profesor se encuentra ocupado para ese día y horario");
    }
  }
};

const crearClase = async (data) => {
  await validarExistenciasYSolapamientos(data);
  return Clase.create(data);
};

const modificarClase = async (id, data) => {
  const clase = await Clase.findByPk(id);
  if (!clase) throw httpError(404, "La clase indicada no existe");

  const merged = {
    dia_semana: data.dia_semana || clase.dia_semana,
    hora_inicio: data.hora_inicio || clase.hora_inicio,
    hora_fin: data.hora_fin || clase.hora_fin,
    cupo: data.cupo !== undefined ? data.cupo : clase.cupo,
    actividad_id: data.actividad_id || clase.actividad_id,
    sala_id: data.sala_id || clase.sala_id,
    profesor_id: data.profesor_id || clase.profesor_id,
  };

  // Validar que el cupo no sea menor a la cantidad de inscriptos activos
  if (data.cupo !== undefined) {
    const inscriptosActivos = await InscripcionMensual.count({
      where: {
        clase_id: id,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] },
      },
    });
    if (data.cupo < inscriptosActivos) {
      throw httpError(409, "No se pudo modificar la clase. El cupo debe ser mayor o igual a la cantidad de inscriptos");
    }
  }

  await validarExistenciasYSolapamientos(merged, id, { isModify: true });
  await clase.update(data);
  return clase;
};

const getClaseById = async (id) => {
  const clase = await Clase.findByPk(id, {
    include: [
      { model: Actividad, as: "actividad" },
      { model: Sala, as: "sala" },
      { model: Profesor, as: "profesor" },
    ],
  });

  if (!clase) throw httpError(404, "Clase no encontrada");

  const cancelaciones = await CancelacionClase.findAll({
    where: { clase_id: id },
    attributes: ["fecha"],
  });
  const fechasCanceladas = cancelaciones.map((c) => c.fecha);

  const proximasFechas = [];
  let actual = new Date();
  const diaObjetivo = MAPA_DIAS[clase.dia_semana];

  while (actual.getDay() !== diaObjetivo) {
    actual.setDate(actual.getDate() + 1);
  }

  let generadas = 0;
  // Buscamos hasta 4 fechas, con un límite de iteraciones por seguridad
  let intentos = 0;
  while (generadas < 4 && intentos < 12) {
    const fechaStr = actual.toISOString().slice(0, 10);
    if (!fechasCanceladas.includes(fechaStr)) {
      proximasFechas.push(fechaStr);
      generadas++;
    }
    actual.setDate(actual.getDate() + 7);
    intentos++;
  }

  return {
    ...clase.toJSON(),
    proximas_fechas: proximasFechas,
  };
};

const deleteClase = async (id) => {
  const clase = await Clase.findByPk(id);
  if (!clase) throw httpError(404, "Clase no encontrada");

  const mensualesActivas = await InscripcionMensual.count({
    where: {
      clase_id: id,
      estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] },
    },
  });

  if (mensualesActivas > 0) {
    throw httpError(409, "No se puede eliminar la clase porque tiene inscripciones mensuales activas");
  }

  const individualesFuturas = await InscripcionIndividual.count({
    where: {
      clase_id: id,
      fecha: { [Op.gte]: new Date() },
    },
  });

  if (individualesFuturas > 0) {
    throw httpError(409, "No se puede eliminar la clase porque tiene inscripciones individuales futuras");
  }

  await clase.update({ activa: false });
  return { message: "La clase fue eliminada exitosamente" };
};

const cancelarFechaClase = async (claseId, data) => {
  const { fecha, motivo } = data;
  if (!fecha) throw httpError(400, "Debe proveer una fecha a cancelar");

  const clase = await Clase.findByPk(claseId);
  if (!clase) throw httpError(404, "Clase no encontrada");

  const fechaObj = new Date(`${fecha}T12:00:00Z`); // Mediodía UTC para evitar desfase de timezone
  if (fechaObj.getDay() !== MAPA_DIAS[clase.dia_semana]) {
    throw httpError(400, `La fecha ${fecha} no es un ${clase.dia_semana}`);
  }

  const hoyStr = new Date().toISOString().slice(0, 10);
  if (fecha < hoyStr) {
    throw httpError(400, "No se puede cancelar una clase pasada");
  }

  const existente = await CancelacionClase.findOne({
    where: { clase_id: claseId, fecha },
  });

  if (existente) {
    throw httpError(409, "Esta fecha ya se encuentra cancelada");
  }

  const cancelacion = await CancelacionClase.create({
    clase_id: claseId,
    fecha,
    motivo,
  });

  // RUTINA DE REINTEGRO
  // Verificar si hay inscriptos para este día específico
  const individualesAfectadas = await InscripcionIndividual.findAll({
    where: { clase_id: claseId, fecha }
  });

  if (individualesAfectadas.length > 0) {
    // TODO: Ejecutar rutina automática de reintegro a cada afectado
    console.log(`[Reintegro] Se debe reintegrar a ${individualesAfectadas.length} inscriptos por la cancelación de la clase ${claseId} el ${fecha}`);
  }

  return cancelacion;
};

module.exports = {
  crearClase,
  modificarClase,
  getClaseById,
  deleteClase,
  cancelarFechaClase,
};
