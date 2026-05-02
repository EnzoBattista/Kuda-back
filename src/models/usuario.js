const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    "Usuario",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "El DNI no puede estar vacío" },
        },
      },
      nombreUsuario: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "El nombre de usuario no puede estar vacío" },
          len: {
            args: [4, 50],
            msg: "El nombre de usuario debe tener entre 4 y 50 caracteres",
          },
        },
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "El nombre no puede estar vacío" } },
      },
      apellido: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "El apellido no puede estar vacío" } },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "La contraseña no puede estar vacía" },
        },
      },
      direccion: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "La dirección no puede estar vacía" } },
      },
      edad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: "La edad debe ser un número entero" },
          min: { args: [18], msg: "Debe ser mayor de 18 años" },
        },
      },
    },
    {
      tableName: "usuarios",
      timestamps: true,
      paranoid: true,
    }
  );

  Usuario.addHook("beforeCreate", async (usuario) => {
    usuario.password = await bcrypt.hash(usuario.password, 10);
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
    return values;
  };

  Usuario.associate = (models) => {
    Usuario.belongsTo(models.Rol, {
      foreignKey: "rol_id",
      as: "rol",
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
