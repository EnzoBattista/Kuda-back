const { Op } = require("sequelize");
const { ReservaClase, Clase, Actividad, Profesor, Sala, Vale, CancelacionClase, InscripcionMensual } = require("../../../db");
const { cancelarReserva } = require("../../services/clases/reservas.service");
const { toReservaDTO } = require("../../dtos/reservas.dto");
const { getFechaHoyLocal, sumarUnMes, sumarDias } = require("../../utils/fechas");

/**
 * Para cada reserva CANCELADA, mira si hay una CancelacionClase para
 * (clase_id, fecha). Si la hay, fue cancelada por el CEF; si no, por el cliente.
 */
const construirSetCanceladasPorCef = async (reservas) => {
  const canceladas = reservas.filter((r) => r.estado === "CANCELADA");
  if (canceladas.length === 0) return new Set();

  const claseIds = [...new Set(canceladas.map((r) => r.clase_id))];
  const fechas = [...new Set(canceladas.map((r) => String(r.fecha_exacta).slice(0, 10)))];

  const cancelaciones = await CancelacionClase.findAll({
    where: { clase_id: { [Op.in]: claseIds }, fecha: { [Op.in]: fechas } },
    attributes: ["clase_id", "fecha"],
  });

  return new Set(
    cancelaciones.map((c) => `${c.clase_id}|${String(c.fecha).slice(0, 10)}`)
  );
};

const claveReserva = (r) =>
  `${r.clase_id}|${String(r.fecha_exacta).slice(0, 10)}`;

const getReservasActivas = async (req, res, next) => {
  try {
    const { cliente_email, actividad_id, clase_id, incluir_canceladas } = req.query;
    const hoy = getFechaHoyLocal();

    const estadosVisibles = incluir_canceladas === "true"
      ? ["ACTIVA", "CANCELADA"]
      : ["ACTIVA"];

    const where = {
      estado: { [Op.in]: estadosVisibles },
      fecha_exacta: { [Op.gte]: hoy },
    };
    if (cliente_email) where.cliente_email = cliente_email;
    if (clase_id) where.clase_id = clase_id;

    const includeClase = {
      model: Clase,
      as: "clase",
      include: [
        { model: Actividad, as: "actividad" },
        { model: Profesor, as: "profesor" },
        { model: Sala, as: "sala" },
      ],
    };
    if (actividad_id) {
      includeClase.where = { actividad_id };
      includeClase.required = true;
    }

    const reservas = await ReservaClase.findAll({
      where,
      include: [includeClase],
      order: [["fecha_exacta", "ASC"]],
    });

    const setCef = await construirSetCanceladasPorCef(reservas);
    const realDtos = reservas.map((r) =>
      toReservaDTO(r, { canceladaPorCef: setCef.has(claveReserva(r)) })
    );

    let dummyDtos = [];
    if (clase_id && incluir_canceladas !== "true" && !cliente_email) {
      // Estamos consultando la ocupación de la clase
      const clase = await Clase.findByPk(clase_id);
      if (clase) {
        const activeSubscriptions = await InscripcionMensual.findAll({
          where: {
            clase_id,
            estado: ["VIGENTE", "EN_GRACIA"],
            periodo_fin: { [Op.gte]: hoy }
          }
        });

        const { fechasDeClaseEnPeriodo } = require("../../services/clases/reservas.service");

        for (const sub of activeSubscriptions) {
          if (req.usuario && sub.cliente_email === req.usuario.email) continue;
          const inicioRenovacion = sumarDias(String(sub.periodo_fin).slice(0, 10), 1);
          const finRenovacion = sumarUnMes(inicioRenovacion);
          const fechasFuturas = fechasDeClaseEnPeriodo(clase.dia_semana, inicioRenovacion, finRenovacion);

          for (const f of fechasFuturas) {
            const yaRenovo = await ReservaClase.findOne({
              where: {
                cliente_email: sub.cliente_email,
                clase_id,
                fecha_exacta: f,
                estado: "ACTIVA"
              }
            });

            if (!yaRenovo) {
              dummyDtos.push({
                id: 0,
                fecha_exacta: f,
                estado: "ACTIVA",
                asistio: null,
                inscripcion_mensual_id: sub.id,
                inscripcion_individual_id: null,
                clase: {
                  id: clase.id,
                  hora_inicio: clase.hora_inicio,
                  hora_fin: clase.hora_fin,
                  cupo: clase.cupo,
                  actividad: null,
                  actividad_descripcion: null,
                  profesor: null,
                  sala: null
                }
              });
            }
          }
        }

        // Agregar también dummys para los bloqueos de lista de espera
        const { ListaEspera } = require("../../../db");
        const waitlist = await ListaEspera.findAll({
          where: {
            clase_id,
            estado: { [Op.in]: ["NOTIFICADO", "ESPERANDO"] }
          }
        });

        for (const w of waitlist) {
          // El cupo está reservado temporalmente para quien está en la lista de espera,
          // por lo que nadie puede reservarlo por el flujo normal.
          if (w.tipo === "INDIVIDUAL" && w.fecha_exacta) {
            dummyDtos.push({
              id: 0,
              fecha_exacta: w.fecha_exacta,
              estado: "ACTIVA",
              asistio: null,
              inscripcion_mensual_id: null,
              inscripcion_individual_id: null,
              clase: {
                id: clase.id,
                hora_inicio: clase.hora_inicio,
                hora_fin: clase.hora_fin,
                cupo: clase.cupo,
                actividad: null,
                actividad_descripcion: null,
                profesor: null,
                sala: null
              }
            });
          } else if (w.tipo === "MENSUAL") {
            const fechasFuturasMensual = fechasDeClaseEnPeriodo(clase.dia_semana, hoy, sumarUnMes(hoy));
            for (const f of fechasFuturasMensual) {
              dummyDtos.push({
                id: 0,
                fecha_exacta: f,
                estado: "ACTIVA",
                asistio: null,
                inscripcion_mensual_id: null,
                inscripcion_individual_id: null,
                clase: {
                  id: clase.id,
                  hora_inicio: clase.hora_inicio,
                  hora_fin: clase.hora_fin,
                  cupo: clase.cupo,
                  actividad: null,
                  actividad_descripcion: null,
                  profesor: null,
                  sala: null
                }
              });
            }
          }
        }
      }
    }

    const todos = [...realDtos, ...dummyDtos];
    if (todos.length === 0) {
      return res.status(200).json({ message: "No posee reservas", data: [] });
    }
    return res.status(200).json(todos);
  } catch (error) {
    return next(error);
  }
};

const getHistorialReservas = async (req, res, next) => {
  try {
    const { cliente_email, desde, hasta, actividad_id, page = 1, limit = 20 } = req.query;
    const hoy = getFechaHoyLocal();

    const where = {
      [Op.or]: [
        { estado: "CANCELADA" },
        { fecha_exacta: { [Op.lt]: hoy } },
      ],
    };
    if (cliente_email) where.cliente_email = cliente_email;
    if (desde) where.fecha_exacta = { ...where.fecha_exacta, [Op.gte]: desde };
    if (hasta) where.fecha_exacta = { ...where.fecha_exacta, [Op.lte]: hasta };

    const includeClase = {
      model: Clase,
      as: "clase",
      include: [
        { model: Actividad, as: "actividad" },
        { model: Profesor, as: "profesor" },
        { model: Sala, as: "sala" },
      ],
    };
    if (actividad_id) {
      includeClase.where = { actividad_id };
      includeClase.required = true;
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await ReservaClase.findAndCountAll({
      where,
      include: [includeClase],
      order: [["fecha_exacta", "DESC"]],
      limit: Number(limit),
      offset,
    });

    if (count === 0) {
      return res.status(200).json({ message: "No se han encontrado reservas", data: [] });
    }
    const setCef = await construirSetCanceladasPorCef(rows);
    return res.status(200).json({
      total: count,
      pagina: Number(page),
      paginas: Math.ceil(count / Number(limit)),
      reservas: rows.map((r) =>
        toReservaDTO(r, { canceladaPorCef: setCef.has(claveReserva(r)) })
      ),
    });
  } catch (error) {
    return next(error);
  }
};

const cancelarReservaController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emailUsuario = req.usuario.email;

    const resultado = await cancelarReserva(id, emailUsuario);

    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

const getMisVales = async (req, res, next) => {
  try {
    let cliente_email = req.usuario.email;
    const { clase_id, vigentes } = req.query;
    
    if (req.query.cliente_email && req.query.cliente_email !== cliente_email) {
      // Verificar si el usuario autenticado es administrador
      const { Usuario, Rol } = require("../../../db");
      const usuarioAuth = await Usuario.findByPk(cliente_email, {
        include: [{ model: Rol, as: "rol" }]
      });
      if (usuarioAuth && usuarioAuth.rol && (usuarioAuth.rol.nombre === "DUEÑO" || usuarioAuth.rol.nombre === "RECEPCIONISTA")) {
        cliente_email = req.query.cliente_email;
      }
    }

    const hoy = getFechaHoyLocal();

    const where = {
      cliente_email,
      usado_en_pago_id: null,
    };
    // Por defecto solo devuelve los vigentes (no vencidos). El front puede pedir
    // todos pasando vigentes=false.
    if (vigentes !== "false") {
      where.valido_hasta = { [Op.gte]: hoy };
    }
    if (clase_id) {
      const claseObjetivo = await Clase.findByPk(clase_id);
      if (claseObjetivo) {
        const clasesMismaActividad = await Clase.findAll({
          where: { actividad_id: claseObjetivo.actividad_id },
          attributes: ["id"],
        });
        const idsClases = clasesMismaActividad.map((c) => c.id);
        where.clase_id = { [Op.in]: idsClases };
      } else {
        where.clase_id = clase_id;
      }
      // Para aplicarlo además tiene que estar dentro del período de validez.
      where.valido_desde = { [Op.lte]: hoy };
    }

    const vales = await Vale.findAll({
      where,
      include: [
        {
          model: Clase,
          as: "clase",
          include: [{ model: Actividad, as: "actividad" }],
        },
      ],
      order: [["valido_hasta", "ASC"]],
    });

    return res.status(200).json(vales);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getReservasActivas,
  getHistorialReservas,
  cancelarReservaController,
  getMisVales,
};
