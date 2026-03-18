const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Plan = sequelize.define(
    "Plan",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      duracion_dias: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "planes",
      timestamps: true,
    }
  );

  return Plan;
};
