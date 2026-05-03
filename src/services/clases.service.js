const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor } = require("../../db");

const validateExistencesAndOverlaps = async (data, excludeClaseId = null) => {
  const { dia_semana, hora_inicio, hora_fin, cupo, actividad_id, sala_id, profesor_id } = data;

  if (cupo !== undefined && cupo < 10) {
    const error = new Error("El cupo dinámico de la clase debe ser de al menos 10 personas");
    error.status = 400;
    throw error;
  }

  if (actividad_id) {
    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) {
      const error = new Error("La actividad indicada no existe");
      error.status = 400;
      throw error;
    }
  }

  if (sala_id) {
    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      const error = new Error("La sala indicada no existe");
      error.status = 400;
      throw error;
    }
    if (!sala.estado_activo) {
      const error = new Error("La sala se encuentra deshabilitada");
      error.status = 400;
      throw error;
    }
    if (cupo !== undefined && cupo > sala.cupo) {
      const error = new Error(`El cupo de la clase no puede superar el cupo máximo de la sala (${sala.cupo})`);
      error.status = 400;
      throw error;
    }
  }

  if (profesor_id) {
    const profesor = await Profesor.findByPk(profesor_id);
    if (!profesor) {
      const error = new Error("El profesor indicado no existe");
      error.status = 400;
      throw error;
    }
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
      const error = new Error("Ya hay una clase agendada en la sala, día y horario seleccionados");
      error.status = 409;
      throw error;
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
      const error = new Error("El profesor seleccionado ya tiene una clase asignada el dia y horario seleccionado.");
      error.status = 409;
      throw error;
    }
  }
};

const crearClase = async (data) => {
  await validateExistencesAndOverlaps(data);
  const clase = await Clase.create(data);
  return clase;
};

const modificarClase = async (id, data) => {
  const clase = await Clase.findByPk(id);
  if (!clase) {
    const error = new Error("La clase indicada no existe");
    error.status = 404;
    throw error;
  }

  // To validate properly, we merge existing data with new data for the checks
  const updatedData = {
    dia_semana: data.dia_semana || clase.dia_semana,
    hora_inicio: data.hora_inicio || clase.hora_inicio,
    hora_fin: data.hora_fin || clase.hora_fin,
    cupo: data.cupo !== undefined ? data.cupo : clase.cupo,
    actividad_id: data.actividad_id || clase.actividad_id,
    sala_id: data.sala_id || clase.sala_id,
    profesor_id: data.profesor_id || clase.profesor_id,
  };

  await validateExistencesAndOverlaps(updatedData, id);

  await clase.update(data);
  return clase;
};

module.exports = {
  crearClase,
  modificarClase,
};
