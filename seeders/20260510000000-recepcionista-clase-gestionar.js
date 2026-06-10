"use strict";

const { ROLES } = require("../src/constants/roles");
const { PERMISOS } = require("../src/constants/permisos");

// La matriz rol-permiso (src/constants/permisos.js) sumó clase.gestionar a
// RECEPCIONISTA después de que el seeder original ya había corrido, dejando la
// BD desactualizada. Este seeder asegura esa asociación de forma idempotente.
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [[rol]] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = :nombre`,
      { replacements: { nombre: ROLES.RECEPCIONISTA } }
    );
    const [[permiso]] = await queryInterface.sequelize.query(
      `SELECT id FROM permisos WHERE clave = :clave`,
      { replacements: { clave: PERMISOS.CLASE_GESTIONAR } }
    );

    if (!rol || !permiso) return;

    const [existente] = await queryInterface.sequelize.query(
      `SELECT 1 FROM rol_permiso WHERE rol_id = :rolId AND permiso_id = :permisoId`,
      { replacements: { rolId: rol.id, permisoId: permiso.id } }
    );

    if (existente.length > 0) return;

    await queryInterface.bulkInsert("rol_permiso", [
      { rol_id: rol.id, permiso_id: permiso.id, createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface) {
    const [[rol]] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = :nombre`,
      { replacements: { nombre: ROLES.RECEPCIONISTA } }
    );
    const [[permiso]] = await queryInterface.sequelize.query(
      `SELECT id FROM permisos WHERE clave = :clave`,
      { replacements: { clave: PERMISOS.CLASE_GESTIONAR } }
    );

    if (!rol || !permiso) return;

    await queryInterface.bulkDelete("rol_permiso", {
      rol_id: rol.id,
      permiso_id: permiso.id,
    });
  },
};
