const { DataTypes } = require("sequelize");

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
      // Ocurrencia concreta de la clase recurrente (la clase define el día de
      // semana; acá se materializa la fecha calendario puntual).
      fecha_exacta: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      // null = todavía no se tomó asistencia para esa fecha.
      asistio: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
      estado: {
        type: DataTypes.ENUM(...ESTADOS),
        allowNull: false,
        defaultValue: "ACTIVA",
      },
      // XOR con inscripcion_individual_id: exactamente uno debe estar seteado.
      inscripcion_mensual_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "inscripciones_mensuales", key: "id" },
      },
      inscripcion_individual_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "inscripciones_individuales", key: "id" },
      },
    },
    {
      tableName: "reservas_clase",
      timestamps: true,
      validate: {
        // Defensa a nivel app del CHECK XOR de la BD: la reserva nació de una
        // inscripción mensual O de una individual, nunca de ambas ni de ninguna.
        exactamenteUnaInscripcion() {
          const tieneMensual = this.inscripcion_mensual_id != null;
          const tieneIndividual = this.inscripcion_individual_id != null;
          if (tieneMensual === tieneIndividual) {
            throw new Error(
              "La reserva debe referenciar exactamente una inscripción (mensual o individual)"
            );
          }
        },
      },
      indexes: [
        // Un cliente no puede tener dos reservas ACTIVAS para la misma clase
        // en la misma fecha; tras cancelar puede volver a reservar (índice
        // parcial sobre estado = 'ACTIVA').
        {
          unique: true,
          name: "reservas_clase_activa_unica",
          fields: ["cliente_email", "clase_id", "fecha_exacta"],
          where: { estado: "ACTIVA" },
        },
        // Acelera el conteo de cupo por clase/fecha.
        {
          name: "reservas_clase_clase_fecha",
          fields: ["clase_id", "fecha_exacta"],
        },
      ],
    }
  );

  ReservaClase.ESTADOS = ESTADOS;

  // El proyecto crea el esquema con conn.sync() (sin migraciones). Sequelize no
  // declara CHECKs a nivel tabla, así que se agrega por SQL crudo tras el sync,
  // de forma idempotente para soportar reinicios.
  ReservaClase.afterSync(async () => {
    const [rows] = await sequelize.query(
      "SELECT 1 FROM pg_constraint WHERE conname = 'reservas_clase_xor_inscripcion'"
    );
    if (rows.length === 0) {
      await sequelize.query(
        'ALTER TABLE "reservas_clase" ADD CONSTRAINT "reservas_clase_xor_inscripcion" ' +
          "CHECK ((inscripcion_mensual_id IS NULL) <> (inscripcion_individual_id IS NULL)) NOT VALID"
      );
    }
  });

  ReservaClase.associate = (models) => {
    ReservaClase.belongsTo(models.Cliente, {
      foreignKey: "cliente_email",
      as: "cliente",
    });
    ReservaClase.belongsTo(models.Clase, {
      foreignKey: "clase_id",
      as: "clase",
    });
    ReservaClase.belongsTo(models.InscripcionMensual, {
      foreignKey: "inscripcion_mensual_id",
      as: "inscripcionMensual",
    });
    ReservaClase.belongsTo(models.InscripcionIndividual, {
      foreignKey: "inscripcion_individual_id",
      as: "inscripcionIndividual",
    });

    // Lado inverso definido acá para no tocar los modelos de inscripción.
    models.InscripcionMensual.hasMany(ReservaClase, {
      foreignKey: "inscripcion_mensual_id",
      as: "reservas",
    });
    models.InscripcionIndividual.hasMany(ReservaClase, {
      foreignKey: "inscripcion_individual_id",
      as: "reservas",
    });
    models.Clase.hasMany(ReservaClase, {
      foreignKey: "clase_id",
      as: "reservas",
    });
  };

  return ReservaClase;
};
