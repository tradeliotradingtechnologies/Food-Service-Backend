import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
const app = express();

dotenv.config({ path: ".env" });

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json());

export default app;
