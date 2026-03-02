import mongoose from "mongoose";
import app from "./app.js";
import { runSeeders } from "./dbseeders/index.js";

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.DB_URI!)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Run seeders (idempotent — safe to run every startup)
    await runSeeders();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
  });
