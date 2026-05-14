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
      },
      valido_desde: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      valido_hasta: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      usado_en_pago_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
