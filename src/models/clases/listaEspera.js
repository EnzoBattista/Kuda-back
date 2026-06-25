const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ListaEspera = sequelize.define(
    "ListaEspera",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      clase_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "clases", key: "id" },
      },
      cliente_email: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: "usuarios", key: "email" },
      },
      /**
       * MENSUAL: espera un cupo fijo (cancelación de membresía)
       * INDIVIDUAL: espera un cupo puntual para una fecha específica
       */
      tipo: {
        type: DataTypes.ENUM("MENSUAL", "INDIVIDUAL"),
        allowNull: false,
      },
      // Solo se usa cuando tipo = 'INDIVIDUAL'
      fecha_exacta: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      estado: {
        type: DataTypes.ENUM("ESPERANDO", "NOTIFICADO", "CONFIRMADO", "EXPIRADO", "RECHAZADO"),
        allowNull: false,
        defaultValue: "ESPERANDO",
      },
      // Posición en la fila. Se calcula al momento de insertar.
      posicion: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Momento exacto en que se envió la notificación
      notificado_en: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "lista_espera",
      timestamps: true,
    }
  );

  ListaEspera.associate = (models) => {
    ListaEspera.belongsTo(models.Clase, {
      foreignKey: "clase_id",
      as: "clase",
    });
    ListaEspera.belongsTo(models.Usuario, {
      foreignKey: "cliente_email",
      as: "cliente",
    });
  };

  return ListaEspera;
};
