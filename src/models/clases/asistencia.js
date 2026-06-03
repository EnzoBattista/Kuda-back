const { DataTypes } = require("sequelize");

const ESTADOS = ["PRESENTE", "DENEGADO", "AUSENTE"];

module.exports = (sequelize) => {
  const Asistencia = sequelize.define(
    "Asistencia",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      reserva_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "reservas_clase", key: "id" },
      },
      cliente_email: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: "clientes", key: "usuario_email" },
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
      estado: {
        type: DataTypes.ENUM(...ESTADOS),
        allowNull: false,
      },
      motivo_denegado: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      registrado_por_email: {
        type: DataTypes.STRING,
        allowNull: true,
        references: { model: "usuarios", key: "email" },
      },
    },
    {
      tableName: "asistencias",
      timestamps: true,
    },
  );

  Asistencia.ESTADOS = ESTADOS;

  Asistencia.associate = (models) => {
    Asistencia.belongsTo(models.ReservaClase, {
      foreignKey: "reserva_id",
      as: "reserva",
    });
    Asistencia.belongsTo(models.Cliente, {
      foreignKey: "cliente_email",
      as: "cliente",
    });
    Asistencia.belongsTo(models.Clase, {
      foreignKey: "clase_id",
      as: "clase",
    });
    Asistencia.belongsTo(models.Usuario, {
      foreignKey: "registrado_por_email",
      as: "registradoPor",
    });
  };

  return Asistencia;
};
