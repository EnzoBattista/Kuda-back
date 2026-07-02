const app = require("./app");
const { conn } = require("./db.js");
const { iniciarJobListaEspera } = require("./src/jobs/listaEspera.job");
const { iniciarJobMensualidades } = require("./src/jobs/mensualidades.job");
require("dotenv").config();

const PORT = process.env.PORT || 3001;
// Syncing all the models at once.
conn.sync({ alter: true }).then(async () => {
  try {
    // Drop old unique constraint if it exists to allow reusing activity names of inactive activities
    await conn.query("ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_nombre_key;");
  } catch (err) {
    console.error("Error dropping activities unique constraint:", err);
  }
  app.listen(PORT, "0.0.0.0", async () => {
    iniciarJobListaEspera();
    iniciarJobMensualidades();
    console.log(`Server running on port ${PORT}`); // eslint-disable-line no-console
  });
});
