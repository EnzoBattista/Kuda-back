const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Cliente = sequelize.define(
    "Cliente",
    {
      usuario_email: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        references: { model: "usuarios", key: "email" },
      },
      genero: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      fichaMedica: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      direccion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "clientes",
      timestamps: true,
      paranoid: true,
    }
  );

  Cliente.associate = (models) => {
    Cliente.belongsTo(models.Usuario, {
      foreignKey: "usuario_email",
      as: "usuario",
    });
  };

  return Cliente;
};
