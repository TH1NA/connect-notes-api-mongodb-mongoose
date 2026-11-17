const app = require("./app");
const mongoose = require("mongoose");

const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/notes-api";

async function startServer() {
  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`Notes API listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to connect to MongoDB:", error);
  process.exitCode = 1;
});
