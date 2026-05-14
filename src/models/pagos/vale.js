const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Vale = sequelize.define(
    "Vale",
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
      monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: "20-25% del monto de la mensualidad cancelada",
      },
      valido_desde: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      valido_hasta: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Generalmente fin del mes siguiente",
      },
      usado_en_pago_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Se completa cuando el vale es aplicado a un pago",
      },
    },
    {
      tableName: "vales",
      timestamps: true,
    }
  );

  Vale.associate = (models) => {
    Vale.belongsTo(models.Cliente, { foreignKey: "cliente_email", as: "cliente" });
  };

  return Vale;
};
