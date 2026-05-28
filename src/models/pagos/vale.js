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
      clase_id: {
        // Clase a la que está atado el vale. Solo se puede aplicar al
        // inscribirse en esa misma clase.
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "clases", key: "id" },
      },
      tipo: {
        // MENSUAL: aplicable solo al pago de mensualidad (mes siguiente).
        // INDIVIDUAL: aplicable solo a próxima inscripción individual de la clase.
        type: DataTypes.ENUM("MENSUAL", "INDIVIDUAL"),
        allowNull: false,
        defaultValue: "MENSUAL",
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
    Vale.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
  };

  return Vale;
};
