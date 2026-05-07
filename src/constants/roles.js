const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  RECEPCIONISTA: "RECEPCIONISTA",
  CLIENTE: "CLIENTE",
});

const ROLES_LIST = Object.values(ROLES);

module.exports = { ROLES, ROLES_LIST };
