import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import userRoute from "./routes/userRoute.js";
const app = express();

dotenv.config({ path: ".env" });

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json());

app.use("/api", userRoute);

export default app;
