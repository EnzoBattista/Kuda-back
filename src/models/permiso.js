const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Permiso = sequelize.define(
    "Permiso",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      clave: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "permisos",
      timestamps: true,
    }
  );

  Permiso.associate = (models) => {
    Permiso.belongsToMany(models.Rol, {
      through: "RolPermiso",
      foreignKey: "permiso_id",
      as: "roles",
    });
  };

  return Permiso;
};
