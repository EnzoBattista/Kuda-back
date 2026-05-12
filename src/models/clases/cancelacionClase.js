const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CancelacionClase = sequelize.define(
    "CancelacionClase",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      motivo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "cancelaciones_clases",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["clase_id", "fecha"],
        },
      ],
    }
  );

  CancelacionClase.associate = (models) => {
    CancelacionClase.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
  };

  return CancelacionClase;
};
