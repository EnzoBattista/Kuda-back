const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Sala = sequelize.define(
    "Sala",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      identificador: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "El identificador de la sala no puede estar vacío" },
        },
      },
      cupo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [10], msg: "El cupo de la sala debe ser de al menos 10 personas" },
        },
      },
      estado_activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "salas",
      timestamps: true,
    }
  );

  Sala.associate = (models) => {
    Sala.hasMany(models.Clase, {
      foreignKey: "sala_id",
      as: "clases",
    });
  };

  return Sala;
};
