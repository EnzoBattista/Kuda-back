const app = require("./app");
const { conn } = require("./db.js");
require("dotenv").config();

const PORT = process.env.PORT || 3001;
// Syncing all the models at once.
conn.sync().then(() => {
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`); // eslint-disable-line no-console
  });
});
