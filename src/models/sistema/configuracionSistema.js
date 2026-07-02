const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ConfiguracionSistema = sequelize.define(
    "ConfiguracionSistema",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: 1,
      },
      dias_gracia_mensual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
          max: 10,
        },
      },
      recordatorio_pago_dia: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        validate: {
          min: 1,
          max: 10,
        },
      },
    },
    {
      tableName: "configuracion_sistema",
      timestamps: true,
    },
  );

  return ConfiguracionSistema;
};
