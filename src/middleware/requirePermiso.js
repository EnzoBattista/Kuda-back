const { Usuario, Rol, Permiso } = require("../../db");

const requirePermiso = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario || !req.usuario.id) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const usuario = await Usuario.findByPk(req.usuario.id, {
        include: [{ model: Rol, as: "rol", include: [{ model: Permiso, as: "permisos" }] }],
      });

      if (!usuario || !usuario.rol) {
        return res.status(403).json({ message: "Sin rol asignado" });
      }

      const tiene = await usuario.rol.tienePermiso(permisoRequerido);
      if (!tiene) {
        return res.status(403).json({
          message: `Permiso requerido: ${permisoRequerido}`,
        });
      }

      req.rol = usuario.rol;
      next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = requirePermiso;
