/**
 * Convierte una instancia del modelo ReservaClase (con sus includes de Clase, Actividad, Profesor, Sala)
 * en un objeto DTO limpio para la respuesta de la API.
 * 
 * @param {object} reserva - Instancia de Sequelize ReservaClase
 * @returns {object} DTO de la reserva
 */
const toReservaDTO = (reserva, { canceladaPorCef = false } = {}) => {
  if (!reserva) return null;

  const dto = {
    id: reserva.id,
    fecha_exacta: reserva.fecha_exacta,
    estado: reserva.estado,
    asistio: reserva.asistio,
    clase: reserva.clase ? {
      id: reserva.clase.id,
      hora_inicio: reserva.clase.hora_inicio,
      hora_fin: reserva.clase.hora_fin,
      cupo: reserva.clase.cupo,
      actividad: reserva.clase.actividad ? reserva.clase.actividad.nombre : null,
      actividad_descripcion: reserva.clase.actividad ? reserva.clase.actividad.descripcion : null,
      profesor: reserva.clase.profesor
        ? `${reserva.clase.profesor.nombre} ${reserva.clase.profesor.apellido}`
        : null,
      sala: reserva.clase.sala ? reserva.clase.sala.nombre : null,
    } : null,
  };

  if (reserva.estado === "CANCELADA") {
    dto.cancelada_por = canceladaPorCef ? "CEF" : "CLIENTE";
  }

  return dto;
};

module.exports = {
  toReservaDTO,
};
