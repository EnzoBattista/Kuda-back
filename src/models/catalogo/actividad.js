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
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    Actividad.belongsToMany(models.Profesor, {
      through: "profesor_actividad",
      as: "profesores",
      foreignKey: "actividad_id",
      otherKey: "profesor_id",
    });
  };

  return Actividad;
};
