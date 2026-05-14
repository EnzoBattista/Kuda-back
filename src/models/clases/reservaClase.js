const { DataTypes } = require("sequelize");

const ORIGENES = ["MENSUAL", "INDIVIDUAL"];
const ESTADOS = ["ACTIVA", "CANCELADA"];

module.exports = (sequelize) => {
  const ReservaClase = sequelize.define(
    "ReservaClase",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      fecha_exacta: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      asistio: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      estado: {
        type: DataTypes.ENUM(...ESTADOS),
        allowNull: false,
        defaultValue: "ACTIVA",
      },
      origen: {
        type: DataTypes.ENUM(...ORIGENES),
        allowNull: false,
      },
      origen_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "reservas_clase",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["cliente_email", "clase_id", "fecha_exacta"],
          where: { estado: "ACTIVA" },
          name: "uq_reserva_activa_cliente_clase_fecha",
        },
      ],
    }
  );

  ReservaClase.ORIGENES = ORIGENES;
  ReservaClase.ESTADOS = ESTADOS;

  ReservaClase.associate = (models) => {
    ReservaClase.belongsTo(models.Cliente, {
      foreignKey: "cliente_email",
      as: "cliente",
    });
    ReservaClase.belongsTo(models.Clase, {
      foreignKey: "clase_id",
      as: "clase",
    });
  };

  return ReservaClase;
};
