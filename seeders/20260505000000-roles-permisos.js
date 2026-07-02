"use strict";

const { ROLES_LIST } = require("../src/constants/roles");
const { PERMISOS_LIST, MATRIZ_ROL_PERMISOS } = require("../src/constants/permisos");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [rolesExistentes] = await queryInterface.sequelize.query(`SELECT nombre FROM roles`);
    const rolesSet = new Set(rolesExistentes.map((r) => r.nombre));
    const rolesNuevos = ROLES_LIST.filter((nombre) => !rolesSet.has(nombre));
    if (rolesNuevos.length > 0) {
      await queryInterface.bulkInsert(
        "roles",
        rolesNuevos.map((nombre) => ({ nombre, createdAt: now, updatedAt: now })),
      );
    }

    const [permisosExistentes] = await queryInterface.sequelize.query(`SELECT clave FROM permisos`);
    const permisosSet = new Set(permisosExistentes.map((p) => p.clave));
    const permisosNuevos = PERMISOS_LIST.filter((clave) => !permisosSet.has(clave));
    if (permisosNuevos.length > 0) {
      await queryInterface.bulkInsert(
        "permisos",
        permisosNuevos.map((clave) => ({
          clave,
          nombre: clave,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    const [rolesDb] = await queryInterface.sequelize.query(`SELECT id, nombre FROM roles`);
    const [permisosDb] = await queryInterface.sequelize.query(`SELECT id, clave FROM permisos`);

    const rolIdPorNombre = Object.fromEntries(rolesDb.map((r) => [r.nombre, r.id]));
    const permisoIdPorClave = Object.fromEntries(permisosDb.map((p) => [p.clave, p.id]));

    const filas = [];
    for (const [nombreRol, claves] of Object.entries(MATRIZ_ROL_PERMISOS)) {
      const rol_id = rolIdPorNombre[nombreRol];
      if (!rol_id) continue;
      for (const clave of claves) {
        const permiso_id = permisoIdPorClave[clave];
        if (!permiso_id) continue;
        filas.push({ rol_id, permiso_id, createdAt: now, updatedAt: now });
      }
    }

    if (filas.length > 0) {
      for (const fila of filas) {
        const [existe] = await queryInterface.sequelize.query(
          `SELECT 1 FROM rol_permiso WHERE rol_id = :rol_id AND permiso_id = :permiso_id LIMIT 1`,
          { replacements: fila },
        );
        if (existe.length === 0) {
          await queryInterface.bulkInsert("rol_permiso", [fila]);
        }
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("rol_permiso", null, {});
    await queryInterface.bulkDelete("permisos", { clave: PERMISOS_LIST }, {});
    await queryInterface.bulkDelete("roles", { nombre: ROLES_LIST }, {});
  },
};
