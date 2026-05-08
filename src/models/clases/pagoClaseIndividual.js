const { DataTypes } = require("sequelize");

const MODALIDADES = ["COMPLETO", "SEÑA"];
const ESTADOS_SEÑA = ["PENDIENTE", "COMPLETADA", "VENCIDA"];

module.exports = (sequelize) => {
  const PagoClaseIndividual = sequelize.define(
    "PagoClaseIndividual",
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
      clase_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "clases", key: "id" },
      },
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "planes", key: "id" },
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      modalidad: {
        type: DataTypes.ENUM(...MODALIDADES),
        allowNull: false,
      },
      estado_seña: {
        type: DataTypes.ENUM(...ESTADOS_SEÑA),
        allowNull: true,
      },
      vencimiento_seña: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      monto_total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      monto_pagado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "pagos_clase_individual",
      timestamps: true,
    }
  );

  PagoClaseIndividual.MODALIDADES = MODALIDADES;
  PagoClaseIndividual.ESTADOS_SEÑA = ESTADOS_SEÑA;

  PagoClaseIndividual.associate = (models) => {
    PagoClaseIndividual.belongsTo(models.Cliente, { foreignKey: "cliente_email", as: "cliente" });
    PagoClaseIndividual.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
    PagoClaseIndividual.belongsTo(models.Plan, { foreignKey: "plan_id", as: "plan" });
  };

  return PagoClaseIndividual;
};
