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
        comment: "Fecha concreta de la clase (ej: 2026-06-03)",
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
        comment: "Indica si la reserva proviene de una inscripción mensual o individual",
      },
      origen_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "ID de la InscripcionMensual o InscripcionIndividual que generó esta reserva",
      },
    },
    {
      tableName: "reservas_clase",
      timestamps: true,
      indexes: [
        // Garantiza que un cliente no tenga dos reservas ACTIVAS para la misma clase el mismo día
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
