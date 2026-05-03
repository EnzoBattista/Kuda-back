const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Actividad = sequelize.define(
    "Actividad",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "El nombre de la actividad no puede estar vacío" },
        },
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "actividades",
      timestamps: true,
    }
  );

  Actividad.associate = (models) => {
    Actividad.hasMany(models.Clase, {
      foreignKey: "actividad_id",
      as: "clases",
    });
  };

  return Actividad;
};
