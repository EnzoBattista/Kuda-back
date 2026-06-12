const app = require("./app");
const { conn } = require("./db.js");
const { iniciarJobListaEspera } = require("./src/jobs/listaEspera.job");
require("dotenv").config();

const PORT = process.env.PORT || 3001;
// Syncing all the models at once.
conn.sync({ alter: true }).then(() => {
  app.listen(PORT, "0.0.0.0", async () => {
    iniciarJobListaEspera();
    console.log(`Server running on port ${PORT}`); // eslint-disable-line no-console
  });
});
