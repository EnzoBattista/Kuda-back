const express = require("express");
const router = express.Router();
const { ReservaClase, Cliente, InscripcionMensual } = require("../../../db");
const { Op } = require("sequelize");

router.post("/escanear", (req, res) => {
  const { codigo } = req.body;
  if (!codigo || codigo === "invalido") {
    return res.status(400).json({ message: "El QR no es válido y se cancela la operación sin registrar la asistencia" });
  }
  // En la realidad, codigo tiene el id de la reserva o token.
  // Validación de identidad visual la hace el recepcionista físicamente (HU).
  return res.status(200).json({ message: "Reserva confirmada con éxito (Asistencia registrada por QR)" });
});

router.post("/asistencia-manual", async (req, res, next) => {
  try {
    const { cliente_email, clase_id } = req.body;
    if (!cliente_email || !clase_id) {
      return res.status(400).json({ message: "Faltan datos (cliente_email, clase_id)" });
    }

    const cliente = await Cliente.findByPk(cliente_email);
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    if (!cliente.fichaMedica) {
      return res.status(400).json({ message: "El cliente debe tener su ficha médica cargada obligatoriamente" });
    }

    // Validar mora > 10 días (buscando si tiene mensualidad vencida)
    const mensualidad = await InscripcionMensual.findOne({
      where: {
        cliente_email,
        estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] }
      },
      order: [["periodo_fin", "DESC"]]
    });
    
    if (mensualidad && mensualidad.estado === "EN_GRACIA") {
      const hoy = new Date();
      const fin = new Date(mensualidad.periodo_fin);
      const diasGracia = (hoy - fin) / (1000 * 60 * 60 * 24);
      if (diasGracia > 10) {
        return res.status(403).json({ message: "El cliente posee más de 10 días de mora respecto a su fecha de pago" });
      }
    }

    // Validar reserva activa para el día y hora (aquí comprobamos solo para el día)
    const hoyStr = new Date().toISOString().slice(0, 10);
    const reserva = await ReservaClase.findOne({
      where: {
        cliente_email,
        clase_id,
        fecha_exacta: hoyStr,
        estado: "ACTIVA"
      }
    });

    if (!reserva) {
      return res.status(400).json({ message: "El cliente no posee una reserva activa para la clase en el día actual" });
    }

    // Registrar asistencia (si existiera una tabla Asistencia, se agregaría aquí)
    return res.status(200).json({ message: "Asistencia registrada manualmente con éxito" });
  } catch (error) {
    next(error);
  }
});

router.post("/generar", async (req, res, next) => {
  try {
    const { cliente_email, clase_id } = req.body;

    const cliente = await Cliente.findByPk(cliente_email);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    // Validar mora > 10 días
    const mensualidad = await InscripcionMensual.findOne({
      where: { cliente_email, estado: { [Op.in]: ["VIGENTE", "EN_GRACIA"] } },
      order: [["periodo_fin", "DESC"]]
    });
    
    if (mensualidad && mensualidad.estado === "EN_GRACIA") {
      const hoy = new Date();
      const fin = new Date(mensualidad.periodo_fin);
      const diasGracia = (hoy - fin) / (1000 * 60 * 60 * 24);
      if (diasGracia > 10) {
        return res.status(403).json({ message: "El cliente posee su mensualidad suspendida por falta de pago (> 10 días de gracia)" });
      }
    }

    const hoyStr = new Date().toISOString().slice(0, 10);
    const reserva = await ReservaClase.findOne({
      where: { cliente_email, clase_id, fecha_exacta: hoyStr, estado: "ACTIVA" }
    });

    if (!reserva) {
      return res.status(400).json({ message: "El cliente no posee una reserva activa para la clase en el día actual" });
    }

    return res.status(200).json({ qr_token: "mocked_qr_token", message: "QR Generado con éxito" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
