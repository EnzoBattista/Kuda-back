const app = require("../app");
const { conn } = require("../db.js");

let isDbConnected = false;

// Middleware to ensure DB is connected before handling requests in serverless environment
app.use(async (req, res, next) => {
  if (!isDbConnected) {
    try {
      await conn.authenticate();
      isDbConnected = true;
      console.log("DB connected successfully in Vercel.");
    } catch (error) {
      console.error("Unable to connect to the database:", error);
      return res.status(500).json({ error: "Database connection error" });
    }
  }
  next();
});

module.exports = app;
