import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";

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
import analyticsRoute from "./routes/analyticsRoute.js";
import reservationRoute from "./routes/reservationRoute.js";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./middleware/errorHandler.js";

const app = express();

dotenv.config({ path: ".env" });

// ── Security: HTTP Headers ──────────────────────────────────────
// Sets Content-Security-Policy, X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security, X-XSS-Protection, etc.
app.use(helmet());

// ── Security: Rate Limiting ─────────────────────────────────────
// Global limiter: 100 requests per 15 min per IP
const globalLimiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: {
    status: "error",
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Stricter limiter for auth endpoints: 20 requests per 15 min per IP
const authLimiter = rateLimit({
  max: 20,
  windowMs: 15 * 60 * 1000,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── CORS ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // Allow cookies
  }),
);

// ── Body Parsing & Cookies ──────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ── Security: NoSQL Injection Prevention ────────────────────────
// Sanitizes req.body, req.query, req.params — strips $ and . characters
app.use(mongoSanitize());

// ── Security: HTTP Parameter Pollution ──────────────────────────
// Prevents duplicate query params, whitelist fields that legitimately repeat
app.use(
  hpp({
    whitelist: ["status", "category", "price", "sort", "page", "limit", "date"],
  }),
);

// ── Compression ─────────────────────────────────────────────────
// Gzip/Brotli response compression for all text-based responses
app.use(compression());

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
app.use("/api/analytics", analyticsRoute);
app.use("/api/reservations", reservationRoute);

// ── 404 Catch-All ───────────────────────────────────────────────
// Any route that doesn't match above will hit this
app.all("*path", (req, _res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});

// ── Global Error Handler ────────────────────────────────────────
// MUST be the last middleware — catches all errors from above
app.use(globalErrorHandler);

export default app;
