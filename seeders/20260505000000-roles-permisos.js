"use strict";

const { ROLES_LIST } = require("../src/constants/roles");
const { PERMISOS_LIST, MATRIZ_ROL_PERMISOS } = require("../src/constants/permisos");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "roles",
      ROLES_LIST.map((nombre) => ({ nombre, createdAt: now, updatedAt: now }))
    );

    await queryInterface.bulkInsert(
      "permisos",
      PERMISOS_LIST.map((clave) => ({
        clave,
        nombre: clave,
        createdAt: now,
        updatedAt: now,
      }))
    );

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
      await queryInterface.bulkInsert("rol_permiso", filas);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("rol_permiso", null, {});
    await queryInterface.bulkDelete("permisos", { clave: PERMISOS_LIST }, {});
    await queryInterface.bulkDelete("roles", { nombre: ROLES_LIST }, {});
  },
};
