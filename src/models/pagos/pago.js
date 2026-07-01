const { DataTypes } = require("sequelize");

const ORIGENES = ["MENSUALIDAD", "CLASE_SUELTA", "SEÑA", "SALDO_SEÑA", "MANUAL"];
const METODOS = ["MERCADO_PAGO"];
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
    if (pago.estado !== "COMPLETADO" || !pago.origen_id) return;
    if (!["SALDO_SEÑA", "SEÑA", "CLASE_SUELTA"].includes(pago.origen)) return;

    try {
      const { InscripcionIndividual } = sequelize.models;
      const ins = await InscripcionIndividual.findByPk(pago.origen_id, {
        transaction: options.transaction,
      });
      if (!ins) return;

      const montoCobrado = Number(pago.monto);
      if (!(montoCobrado > 0)) return;

      if (pago.origen === "SALDO_SEÑA") {
        if (ins.modalidad === "SEÑA" && ins.estado_seña === "PENDIENTE") {
          ins.estado_seña = "COMPLETADA";
          ins.monto_pagado = Number((Number(ins.monto_pagado || 0) + montoCobrado).toFixed(2));
          await ins.save({ transaction: options.transaction });
        }
        return;
      }

      if (pago.origen === "SEÑA") {
        if (ins.modalidad !== "SEÑA") return;
        ins.monto_pagado = montoCobrado;
        await ins.save({ transaction: options.transaction });
        return;
      }

      if (pago.origen === "CLASE_SUELTA" && ins.modalidad === "COMPLETO") {
        ins.monto_pagado = montoCobrado;
        await ins.save({ transaction: options.transaction });
      }
    } catch (err) {
      console.error("[pago.hook] Error al actualizar seña:", err.message);
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
