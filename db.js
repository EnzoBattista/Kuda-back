require("dotenv").config();
const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME } = process.env;

const sequelize = new Sequelize(
  `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`,
  {
    logging: false,
    native: false,
  }
);

const modelsDir = path.join(__dirname, "src", "models");
const modelDefiners = [];

const collectModelFiles = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectModelFiles(full);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      modelDefiners.push(require(full));
    }
  }
};

collectModelFiles(modelsDir);

modelDefiners.forEach((model) => model(sequelize));

const entries = Object.entries(sequelize.models);
const capsEntries = entries.map(([name, model]) => [
  name[0].toUpperCase() + name.slice(1),
  model,
]);
sequelize.models = Object.fromEntries(capsEntries);

Object.values(sequelize.models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(sequelize.models);
  }
});

module.exports = {
  ...sequelize.models,
  conn: sequelize,
};
