const { Op } = require("sequelize");
const { Clase, Actividad, Sala, Profesor } = require("../../../db");
const httpError = require("../../utils/httpError");

const validarExistenciasYSolapamientos = async (data, excludeClaseId = null) => {
  const { dia_semana, hora_inicio, hora_fin, cupo, actividad_id, sala_id, profesor_id } = data;

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
