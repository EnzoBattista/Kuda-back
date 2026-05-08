const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Sucursal = sequelize.define(
    "Sucursal",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      localidad: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      telefono: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      direccion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "sucursales",
      timestamps: true,
    }
  );

  return Sucursal;
};
