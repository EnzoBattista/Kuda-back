const { DataTypes } = require("sequelize");

const ORIGENES = ["MENSUALIDAD", "CLASE_SUELTA", "SEÑA", "SALDO_SEÑA", "MANUAL"];
const METODOS = ["EFECTIVO", "TRANSFERENCIA", "MERCADO_PAGO", "QR"];
const ESTADOS = ["PENDIENTE", "COMPLETADO", "RECHAZADO"];

module.exports = (sequelize) => {
  const Pago = sequelize.define(
    "Pago",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cliente_email: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: "clientes", key: "usuario_email" },
      },
      recepcionista_email: {
        type: DataTypes.STRING,
        allowNull: true,
        references: { model: "usuarios", key: "email" },
      },
      origen: {
        type: DataTypes.ENUM(...ORIGENES),
        allowNull: true,
      },
      origen_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reserva_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "reservas_clase", key: "id" },
      },
      inscripcion_mensual_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "inscripciones_mensuales", key: "id" },
      },
      concepto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      metodo: {
        type: DataTypes.ENUM(...METODOS),
        allowNull: false,
        defaultValue: "MERCADO_PAGO",
      },
      estado: {
        type: DataTypes.ENUM(...ESTADOS),
        allowNull: false,
        defaultValue: "COMPLETADO",
      },
      mp_payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      qr_referencia: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "pagos",
      timestamps: true,
    },
  );

  Pago.ORIGENES = ORIGENES;
  Pago.METODOS = METODOS;
  Pago.ESTADOS = ESTADOS;

  const completarSenaSiCorresponde = async (pago, options) => {
    if (pago.estado === "COMPLETADO" && (pago.origen === "SALDO_SEÑA" || pago.origen === "SEÑA") && pago.origen_id) {
      try {
        const { InscripcionIndividual } = sequelize.models;
        const ins = await InscripcionIndividual.findByPk(pago.origen_id, { transaction: options.transaction });
        if (ins && ins.estado_seña === "PENDIENTE") {
          ins.estado_seña = "COMPLETADA";
          ins.monto_pagado = ins.monto_total;
          await ins.save({ transaction: options.transaction });
          console.log(`[pago.hook] Seña completada automáticamente para inscripción ${pago.origen_id}`);
        }
      } catch (err) {
        console.error("[pago.hook] Error al completar seña automáticamente:", err.message);
      }
    }
  };

  Pago.addHook("afterCreate", async (pago, options) => {
    await completarSenaSiCorresponde(pago, options);
  });

  Pago.addHook("afterUpdate", async (pago, options) => {
    await completarSenaSiCorresponde(pago, options);
  });

  Pago.associate = (models) => {
    Pago.belongsTo(models.Cliente, { foreignKey: "cliente_email", as: "cliente" });
    Pago.belongsTo(models.Usuario, { foreignKey: "recepcionista_email", as: "recepcionista" });
    Pago.belongsTo(models.ReservaClase, { foreignKey: "reserva_id", as: "reserva" });
    Pago.belongsTo(models.InscripcionMensual, {
      foreignKey: "inscripcion_mensual_id",
      as: "inscripcionMensual",
    });
  };

  return Pago;
};
