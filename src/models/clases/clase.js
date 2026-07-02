const { DataTypes } = require("sequelize");

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

module.exports = (sequelize) => {
  const Clase = sequelize.define(
    "Clase",
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
      dia_semana: {
        type: DataTypes.ENUM(...DIAS_SEMANA),
        allowNull: false,
      },
      hora_inicio: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      hora_fin: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      cupo: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      actividad_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "actividades", key: "id" },
      },
      sala_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "salas", key: "id" },
      },
      profesor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "profesores", key: "id" },
      },
    },
    {
      tableName: "clases",
      timestamps: true,
      paranoid: true,
    }
  );

  Clase.DIAS_SEMANA = DIAS_SEMANA;

  Clase.associate = (models) => {
    Clase.belongsTo(models.Actividad, {
      foreignKey: "actividad_id",
      as: "actividad",
    });
    Clase.belongsTo(models.Sala, {
      foreignKey: "sala_id",
      as: "sala",
    });
    Clase.belongsTo(models.Profesor, {
      foreignKey: "profesor_id",
      as: "profesor",
    });
  };

  return Clase;
};
