const { DataTypes } = require("sequelize");
const { ROLES_LIST } = require("../../constants/roles");

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
        type: DataTypes.ENUM(...ROLES_LIST),
        allowNull: false,
        unique: true,
        validate: {
          isIn: {
            args: [ROLES_LIST],
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
    return this.permisos.some((p) => p.clave === permisoRequerido);
  };

  return Rol;
};
