const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    "Usuario",
    {
      email: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      apellido: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      telefono: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tokenConfirmacion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tokenExpiracion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      fecha_intento_registro: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "usuarios",
      timestamps: true,
      paranoid: true,
    }
  );

  Usuario.addHook("beforeCreate", async (usuario) => {
    if (usuario.password) {
      usuario.password = await bcrypt.hash(usuario.password, 10);
    }
  });

  Usuario.addHook("beforeUpdate", async (usuario) => {
    if (usuario.changed("password")) {
      usuario.password = await bcrypt.hash(usuario.password, 10);
    }
  });

  Usuario.prototype.verificarPassword = function (passwordPlana) {
    return bcrypt.compare(passwordPlana, this.password);
  };

  Usuario.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    
    if (values.activo) {
      values.estado = "ACTIVO";
    } else if (values.tokenConfirmacion) {
      values.estado = "PENDIENTE";
    } else {
      values.estado = "ELIMINADO";
    }
    
    // Provide a clean email for UI display if it was deleted
    values.displayEmail = values.email.split("_deleted_")[0];
    
    delete values.tokenConfirmacion;
    return values;
  };

  Usuario.associate = (models) => {
    Usuario.belongsTo(models.Rol, {
      foreignKey: "rol_id",
      as: "rol",
    });
    Usuario.hasOne(models.Cliente, {
      foreignKey: "usuario_email",
      as: "cliente",
    });
  };

  Usuario.prototype.tienePermiso = async function (permisoRequerido) {
    if (!this.rol) {
      await this.reload({ include: ["rol"] });
    }
    return this.rol.tienePermiso(permisoRequerido);
  };

  return Usuario;
};
