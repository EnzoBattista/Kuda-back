const { DataTypes } = require("sequelize");

const TIPOS = ["MENSUAL", "INDIVIDUAL"];

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
      actividad_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "actividades", key: "id" },
      },
      tipo: {
        type: DataTypes.ENUM(...TIPOS),
        allowNull: false,
      },
      precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "planes",
      timestamps: true,
    }
  );

  Plan.TIPOS = TIPOS;

  Plan.associate = (models) => {
    Plan.belongsTo(models.Actividad, { foreignKey: "actividad_id", as: "actividad" });
  };

  return Plan;
};
