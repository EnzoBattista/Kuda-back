const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Profesor = sequelize.define(
    "Profesor",
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
      apellido: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "profesores",
      timestamps: true,
      paranoid: true,
    }
  );

  Profesor.associate = (models) => {
    Profesor.hasMany(models.Clase, {
      foreignKey: "profesor_id",
      as: "clases",
    });
    Profesor.belongsToMany(models.Actividad, {
      through: "profesor_actividad",
      as: "actividades",
      foreignKey: "profesor_id",
      otherKey: "actividad_id",
    });
  };

  return Profesor;
};
