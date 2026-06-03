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
      foto_perfil: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notificaciones_activas: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      canales_notificacion: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          email: true,
          sms: false,
          push: false,
          recordatorios_clases: true,
          promociones: false,
          recordatorio_pago_dia: null,
        },
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
