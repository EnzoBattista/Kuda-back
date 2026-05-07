const { DataTypes } = require("sequelize");

const ORIGENES = ["MENSUALIDAD", "CLASE_SUELTA", "SEÑA", "SALDO_SEÑA"];
const MEDIOS = ["MP"];

module.exports = (sequelize) => {
  const Pago = sequelize.define(
    "Pago",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "usuarios", key: "id" },
      },
      recepcionista_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
      },
      origen: {
        type: DataTypes.ENUM(...ORIGENES),
        allowNull: false,
      },
      origen_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      medio: {
        type: DataTypes.ENUM(...MEDIOS),
        allowNull: false,
        defaultValue: "MP",
      },
      mp_payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "pagos",
      timestamps: true,
    }
  );

  Pago.ORIGENES = ORIGENES;
  Pago.MEDIOS = MEDIOS;

  Pago.associate = (models) => {
    Pago.belongsTo(models.Usuario, { foreignKey: "usuario_id", as: "usuario" });
    Pago.belongsTo(models.Usuario, { foreignKey: "recepcionista_id", as: "recepcionista" });
  };

  return Pago;
};
