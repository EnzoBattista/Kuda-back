"use strict";

require("dotenv").config();
const { conn } = require("../db");

(async () => {
  try {
    const tables = ["actividades", "salas", "profesores", "clases", "usuarios"];
    for (const t of tables) {
      const [[row]] = await conn.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      console.log(`${t}: ${row.n}`);
    }
    try {
      const [seeds] = await conn.query(`SELECT name FROM "SequelizeMeta" ORDER BY name`);
      console.log("SequelizeMeta:", seeds.map((s) => s.name).join(", "));
    } catch {
      console.log("SequelizeMeta: (tabla no creada en esta BD)");
    }
  } finally {
    await conn.close();
  }
})();
