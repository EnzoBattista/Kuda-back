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
        validate: {
          notEmpty: {
            msg: "La localidad no puede estar vacía",
          },
        },
      },
      telefono: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "El teléfono no puede estar vacío",
          },
          is: {
            args: /^[0-9+\- ]+$/,
            msg: "El teléfono solo puede contener números, +, - o espacios",
          },
        },
      },
      direccion: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "La dirección no puede estar vacía",
          },
        },
      },
    },
    {
      tableName: "sucursales",
      timestamps: true,
    }
  );

  return Sucursal;
};
