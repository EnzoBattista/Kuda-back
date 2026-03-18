const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Rol = sequelize.define(
    "Rol",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.ENUM("admin", "visitante", "cliente", "trabajador"),
        allowNull: false,
        validate: {
          isIn: {
            args: [["admin", "visitante", "cliente", "trabajador"]],
            msg: "Rol no válido",
          },
        },
      },
    },
    {
      tableName: "roles",
      timestamps: true,
    }
  );

  Rol.associate = (models) => {
    Rol.hasMany(models.Usuario, {
      foreignKey: "rol_id",
      as: "usuarios",
    });

    Rol.belongsToMany(models.Permiso, {
      through: "RolPermiso",
      foreignKey: "rol_id",
      as: "permisos",
    });
  };

  Rol.prototype.tienePermiso = async function (permisoRequerido) {
    if (!this.permisos) {
      await this.reload({ include: ["permisos"] });
    }

    return this.permisos.some(
      (permiso) =>
        permiso.clave === permisoRequerido || permiso.clave === "admin"
    );
  };

  return Rol;
};
