import express from "express";
import dotenv from "dotenv";

// Load env FIRST — before anything reads process.env
dotenv.config();

import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "./middleware/mongoSanitize.js";
import hpp from "hpp";
import compression from "compression";
import { requireApiKey } from "./middleware/apiKey.js";

// ── Route imports ─────────────────────────────────────────────
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
import uploadRoute from "./routes/uploadRoute.js";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./middleware/errorHandler.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// ── Trust Proxy ─────────────────────────────────────────────────
// Required behind Nginx, ALB, Cloudflare, etc. so express sees
// the real client IP for rate limiting and logging.
if (isProduction) {
  app.set("trust proxy", 1);
}

// ── Security: HTTP Headers ──────────────────────────────────────
app.use(helmet());

// ── Security: Rate Limiting ─────────────────────────────────────
const globalLimiter = rateLimit({
  max: isProduction ? 100 : 1000, // relaxed in dev
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

const authLimiter = rateLimit({
  max: isProduction ? 20 : 200,
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

// ── Logging ─────────────────────────────────────────────────────
if (isProduction) {
  // Compact, machine-parseable log line for production
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// ── CORS ────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ── Body Parsing & Cookies ──────────────────────────────────────
// Skip JSON parsing for the Paystack webhook — it needs the raw body
// for HMAC signature verification (handled in the route itself).
app.use((req, res, next) => {
  if (req.originalUrl === "/api/v1/payments/webhook/paystack") {
    return next();
  }
  express.json({ limit: "10kb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ── Security: NoSQL Injection Prevention ────────────────────────
app.use(mongoSanitize);

// ── Security: HTTP Parameter Pollution ──────────────────────────
app.use(
  hpp({
    whitelist: ["status", "category", "price", "sort", "page", "limit", "date"],
  }),
);

// ── Compression ─────────────────────────────────────────────────
app.use(compression());

// ── Health Check ────────────────────────────────────────────────
// Must be ABOVE auth — no auth needed. Load balancers / uptime monitors hit this.
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── API Key Gate ────────────────────────────────────────────────
// Every /api/* request must carry a valid X-API-Key header.
// The Paystack webhook is exempt — it authenticates via HMAC signature.
app.use("/api", requireApiKey);

// ── API Routes ──────────────────────────────────────────────────
app.use("/api/v1/auth", userRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/menu-items", menuItemRoute);
app.use("/api/v1/daily-specials", dailySpecialRoute);
app.use("/api/v1/addresses", addressRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/testimonials", testimonialRoute);
app.use("/api/v1/likes", menuItemLikeRoute);
app.use("/api/v1/newsletter", newsletterRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/analytics", analyticsRoute);
app.use("/api/v1/reservations", reservationRoute);
app.use("/api/v1/uploads", uploadRoute);

// ── 404 Catch-All ───────────────────────────────────────────────
app.all("*path", (req, _res, next) => {
  next(
    new AppError(
      `Cannot find ${req.method} ${req.originalUrl} on this server`,
      404,
    ),
  );
});

// ── Global Error Handler ────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
