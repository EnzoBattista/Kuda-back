const { DataTypes } = require("sequelize");

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
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
        validate: {
          notEmpty: { msg: "El nombre de la clase no puede estar vacío" },
        },
      },
      dia_semana: {
        type: DataTypes.ENUM(...DIAS_SEMANA),
        allowNull: false,
        validate: {
          isIn: {
            args: [DIAS_SEMANA],
            msg: "Día de la semana no válido",
          },
        },
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
        validate: {
          min: { args: [10], msg: "El cupo mínimo es de 10 personas" },
          max: { args: [50], msg: "El cupo máximo es de 50 personas" },
        },
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
    },
    {
      tableName: "clases",
      timestamps: true,
      paranoid: true,
      validate: {
        horarioCoherente() {
          if (this.hora_inicio && this.hora_fin && this.hora_fin <= this.hora_inicio) {
            throw new Error("La hora de fin debe ser posterior a la hora de inicio");
          }
        },
      },
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
  };

  return Clase;
};
