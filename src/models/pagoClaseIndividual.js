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
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "usuarios", key: "id" },
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
      validate: {
        coherenciaSeña() {
          if (this.modalidad === "SEÑA") {
            if (!this.estado_seña || !this.vencimiento_seña) {
              throw new Error("Una seña requiere estado_seña y vencimiento_seña");
            }
          } else if (this.modalidad === "COMPLETO") {
            if (this.estado_seña || this.vencimiento_seña) {
              throw new Error("Pago COMPLETO no debe tener datos de seña");
            }
          }
        },
      },
    }
  );

  PagoClaseIndividual.MODALIDADES = MODALIDADES;
  PagoClaseIndividual.ESTADOS_SEÑA = ESTADOS_SEÑA;

  PagoClaseIndividual.associate = (models) => {
    PagoClaseIndividual.belongsTo(models.Usuario, { foreignKey: "usuario_id", as: "usuario" });
    PagoClaseIndividual.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
    PagoClaseIndividual.belongsTo(models.Plan, { foreignKey: "plan_id", as: "plan" });
  };

  return PagoClaseIndividual;
};
