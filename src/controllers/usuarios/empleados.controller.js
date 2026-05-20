const { Op } = require("sequelize");
const { Usuario, Rol } = require("../../../db");
const { ROLES } = require("../../constants/roles");

const ROLES_EMPLEADO = [ROLES.ADMIN, ROLES.RECEPCIONISTA];

const includeRolEmpleado = (rolFiltro) => {
  const where = rolFiltro && ROLES_EMPLEADO.includes(rolFiltro.toUpperCase())
    ? { nombre: rolFiltro.toUpperCase() }
    : { nombre: { [Op.in]: ROLES_EMPLEADO } };
  return { model: Rol, as: "rol", where, required: true };
};

const getAllEmpleados = async (req, res, next) => {
  try {
    const { rol, activo, q } = req.query;
    const where = {};

    if (activo === "true") where.activo = true;
    if (activo === "false") where.activo = false;

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.iLike]: term } },
        { apellido: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { dni: { [Op.iLike]: term } },
      ];
    }

    const empleados = await Usuario.findAll({
      where,
      include: [includeRolEmpleado(rol)],
      order: [["apellido", "ASC"], ["nombre", "ASC"]],
    });
    if (empleados.length === 0) {
      return res.status(200).json({ message: "No se han encontrado empleados", data: [] });
    }
    return res.status(200).json(empleados);
  } catch (error) {
    return next(error);
  }
};

const getEmpleadoByEmail = async (req, res, next) => {
  try {
    const empleado = await Usuario.findByPk(req.params.email, {
      include: [includeRolEmpleado()],
    });
    if (!empleado) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }
    return res.status(200).json(empleado);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAllEmpleados, getEmpleadoByEmail };
