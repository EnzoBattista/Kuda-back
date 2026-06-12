const {
  anotarseEnLista,
  removerDeListaManual,
  obtenerPendientesCliente,
  confirmarCupo,
  rechazarCupo,
  getListaEspera,
  listarListaEspera,
} = require("../../services/clases/listaEspera.service");

/**
 * GET /api/lista-espera
 * Query: ?clase_id=&tipo=&fecha_exacta=
 */
const getListaGlobal = async (req, res, next) => {
  try {
    const { clase_id, tipo, fecha_exacta } = req.query;
    const lista = await listarListaEspera({
      clase_id: clase_id ? Number(clase_id) : undefined,
      tipo,
      fecha_exacta,
    });

    if (lista.length === 0) {
      return res.status(200).json({ message: "No hay clientes en la lista de espera", data: [] });
    }
    return res.status(200).json(lista);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/lista-espera
 * Body: { clase_id, tipo, fecha_exacta? }
 * El cliente logueado se anota en la lista de espera.
 */
const anotarse = async (req, res, next) => {
  try {
    const { clase_id, tipo, fecha_exacta } = req.body;
    const clienteEmail = req.usuario.email;

    if (!clase_id || !tipo) {
      return res.status(400).json({ message: "clase_id y tipo son requeridos" });
    }

    const entrada = await anotarseEnLista(clienteEmail, clase_id, tipo, fecha_exacta ?? null);
    const msg = tipo === "MENSUAL" 
      ? `Se lo ha agregado a la lista de espera de abonados en el puesto ${entrada.posicion}. Si se libera un cupo, se le notificara de inmediato.` 
      : `Se lo ha agregado a la lista de espera de no abonados en el puesto ${entrada.posicion}. Si se libera un cupo, se le notificara de inmediato.`;
    return res.status(201).json({
      message: msg,
      posicion: entrada.posicion,
      entrada,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

/**
 * GET /api/lista-espera/:claseId
 * Query: ?tipo=MENSUAL|INDIVIDUAL&fecha_exacta=YYYY-MM-DD
 * Recepcionista consulta quiénes están en espera para una clase.
 */
const getLista = async (req, res, next) => {
  try {
    const { claseId } = req.params;
    const { tipo, fecha_exacta } = req.query;

    const lista = await getListaEspera(claseId, tipo, fecha_exacta ?? null);
    if (lista.length === 0) {
      return res.status(200).json({ message: "No hay clientes en la lista de espera", data: [] });
    }
    return res.status(200).json(lista);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/lista-espera/me/pendientes
 * Cupos liberados que el cliente debe confirmar o rechazar.
 */
const getMisPendientes = async (req, res, next) => {
  try {
    const pendientes = await obtenerPendientesCliente(req.usuario.email);
    if (pendientes.length === 0) {
      return res.status(200).json({ message: "No tenés cupos pendientes de confirmación", data: [] });
    }
    return res.status(200).json(pendientes);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/lista-espera/:id/confirmar
 * El cliente confirma el cupo notificado desde la lista de espera.
 */
const confirmar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resultado = await confirmarCupo(Number(id), req.usuario.email);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

/**
 * POST /api/lista-espera/:id/rechazar
 * El cliente rechaza el cupo notificado desde la lista de espera.
 */
const rechazar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resultado = await rechazarCupo(Number(id), req.usuario.email);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

/**
 * DELETE /api/lista-espera/:id
 * Recepcionista remueve manualmente a un cliente de la lista.
 */
const removerManual = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resultado = await removerDeListaManual(id);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

module.exports = {
  anotarse,
  getListaGlobal,
  getLista,
  getMisPendientes,
  confirmar,
  rechazar,
  removerManual,
};
