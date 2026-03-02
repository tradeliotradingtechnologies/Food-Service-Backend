import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// ── Route imports ───────────────────────────────────────────────
import userRoute from "./routes/userRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import menuItemRoute from "./routes/menuItemRoute.js";
import dailySpecialRoute from "./routes/dailySpecialRoute.js";
import addressRoute from "./routes/addressRoute.js";
import cartRoute from "./routes/cartRoute.js";
import orderRoute from "./routes/orderRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import testimonialRoute from "./routes/testimonialRoute.js";
import menuItemLikeRoute from "./routes/menuItemLikeRoute.js";
import newsletterRoute from "./routes/newsletterRoute.js";
import adminRoute from "./routes/adminRoute.js";

const app = express();

dotenv.config({ path: ".env" });

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // Allow cookies
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// ── API Routes ──────────────────────────────────────────────────
app.use("/api/auth", userRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/menu-items", menuItemRoute);
app.use("/api/daily-specials", dailySpecialRoute);
app.use("/api/addresses", addressRoute);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoute);
app.use("/api/payments", paymentRoute);
app.use("/api/testimonials", testimonialRoute);
app.use("/api/likes", menuItemLikeRoute);
app.use("/api/newsletter", newsletterRoute);
app.use("/api/admin", adminRoute);

export default app;
