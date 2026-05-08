const { DataTypes } = require("sequelize");

const ESTADOS = ["VIGENTE", "EN_GRACIA", "SUSPENDIDA", "FINALIZADA", "CANCELADA"];

module.exports = (sequelize) => {
  const Mensualidad = sequelize.define(
    "Mensualidad",
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
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "planes", key: "id" },
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
    },
    {
      tableName: "mensualidades",
      timestamps: true,
      validate: {
        periodoCoherente() {
          if (this.periodo_inicio && this.periodo_fin && this.periodo_fin <= this.periodo_inicio) {
            throw new Error("periodo_fin debe ser posterior a periodo_inicio");
          }
        },
      },
    }
  );

  Mensualidad.ESTADOS = ESTADOS;

  Mensualidad.addHook("beforeValidate", async (mensualidad) => {
    if (mensualidad.plan_id && !mensualidad.actividad_id) {
      const Plan = sequelize.models.Plan;
      const plan = await Plan.findByPk(mensualidad.plan_id);
      if (plan) mensualidad.actividad_id = plan.actividad_id;
    }
  });

  Mensualidad.associate = (models) => {
    Mensualidad.belongsTo(models.Usuario, { foreignKey: "usuario_id", as: "usuario" });
    Mensualidad.belongsTo(models.Actividad, { foreignKey: "actividad_id", as: "actividad" });
    Mensualidad.belongsTo(models.Clase, { foreignKey: "clase_id", as: "clase" });
    Mensualidad.belongsTo(models.Plan, { foreignKey: "plan_id", as: "plan" });
  };

  return Mensualidad;
};
