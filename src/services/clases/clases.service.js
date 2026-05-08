const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor } = require("../../../db");
const httpError = require("../../utils/httpError");

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

const validarExistenciasYSolapamientos = async (data, excludeClaseId = null) => {
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
    throw httpError(400, "El cupo dinámico de la clase debe ser de al menos 10 personas");
  }

  if (actividad_id) {
    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) throw httpError(400, "La actividad indicada no existe");
  }

  if (sala_id) {
    const sala = await Sala.findByPk(sala_id);
    if (!sala) throw httpError(400, "La sala indicada no existe");
    if (!sala.estado_activo) throw httpError(400, "La sala se encuentra deshabilitada");
    if (cupo !== undefined && cupo > sala.cupo) {
      throw httpError(400, `El cupo de la clase no puede superar el cupo máximo de la sala (${sala.cupo})`);
    }
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
      throw httpError(409, "Ya hay una clase agendada en la sala, día y horario seleccionados");
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
      throw httpError(409, "El profesor seleccionado ya tiene una clase asignada el dia y horario seleccionado.");
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

  await validarExistenciasYSolapamientos(merged, id);
  await clase.update(data);
  return clase;
};

module.exports = {
  crearClase,
  modificarClase,
};
