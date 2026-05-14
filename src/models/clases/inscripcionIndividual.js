const { DataTypes } = require("sequelize");

const MODALIDADES = ["COMPLETO", "SEÑA"];
const ESTADOS_SEÑA = ["PENDIENTE", "COMPLETADA", "VENCIDA"];

module.exports = (sequelize) => {
  const InscripcionIndividual = sequelize.define(
    "InscripcionIndividual",
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
      actividad_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "actividades", key: "id" },
      },
      clase_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "clases", key: "id" },
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
      tableName: "inscripciones_individuales",
      timestamps: true,
    }
  );

  InscripcionIndividual.MODALIDADES = MODALIDADES;
  InscripcionIndividual.ESTADOS_SEÑA = ESTADOS_SEÑA;

  InscripcionIndividual.associate = (models) => {
    InscripcionIndividual.belongsTo(models.Cliente, { foreignKey: "cliente_email", as: "cliente" });
    InscripcionIndividual.belongsTo(models.Actividad, { foreignKey: "actividad_id", as: "actividad" });
    InscripcionIndividual.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
    InscripcionIndividual.hasMany(models.ReservaClase, {
      foreignKey: "origen_id",
      constraints: false,
      scope: { origen: "INDIVIDUAL" },
      as: "reservas",
    });
  };

  return InscripcionIndividual;
};
