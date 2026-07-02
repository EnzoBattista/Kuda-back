const { DataTypes } = require("sequelize");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA", "PENDIENTE_PAGO"];

module.exports = (sequelize) => {
  const InscripcionMensual = sequelize.define(
    "InscripcionMensual",
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
      actividad_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "actividades", key: "id" },
      },
      clase_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "clases", key: "id" },
      },
      periodo_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      periodo_fin: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      dia_vencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM(...ESTADOS),
        allowNull: false,
        defaultValue: "VIGENTE",
      },
      monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      dias_gracia: {
        // Snapshot de los días de gracia configurados al momento de generar la
        // inscripción. Se fija acá para que cambiar la config del sistema solo
        // afecte a los meses siguientes y nunca a quien ya está en gracia.
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      inscripcion_anterior_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "inscripciones_mensuales", key: "id" },
      },
    },
    {
      tableName: "inscripciones_mensuales",
      timestamps: true,
    }
  );

  InscripcionMensual.ESTADOS = ESTADOS;

  InscripcionMensual.associate = (models) => {
    InscripcionMensual.belongsTo(models.Cliente, { foreignKey: "cliente_email", as: "cliente" });
    InscripcionMensual.belongsTo(models.Actividad, { foreignKey: "actividad_id", as: "actividad" });
    InscripcionMensual.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
    InscripcionMensual.belongsTo(models.InscripcionMensual, {
      foreignKey: "inscripcion_anterior_id",
      as: "inscripcionAnterior",
    });
  };

  return InscripcionMensual;
};
