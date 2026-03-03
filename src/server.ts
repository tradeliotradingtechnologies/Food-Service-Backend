import mongoose from "mongoose";
import app from "./app.js";
import { runSeeders } from "./dbseeders/index.js";
import { validateEnv } from "./utils/validateEnv.js";
import type { Server } from "http";

// ── 1. Validate environment ─────────────────────────────────────
const env = validateEnv();
const PORT = env.PORT;

let server: Server;

// ── 2. Connect & start ──────────────────────────────────────────
mongoose
  .connect(env.DB_URI)
  .then(async () => {
    console.log(`✅ Connected to MongoDB (${env.NODE_ENV})`);

    // Run seeders (idempotent — safe to run every startup)
    await runSeeders();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ── 3. Graceful shutdown ────────────────────────────────────────
// Closes HTTP connections and DB pool before the process exits.
// Triggered by Docker stop, Ctrl+C, PM2 reload, SIGTERM from orchestrators.

function gracefulShutdown(signal: string) {
  console.log(`\n🛑 ${signal} received — shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      console.log("   HTTP server closed.");
      try {
        await mongoose.connection.close();
        console.log("   MongoDB connection closed.");
      } catch {
        // ignore close errors during shutdown
      }
      process.exit(0);
    });

    // Force kill after 10s if connections are hanging
    setTimeout(() => {
      console.error("   ⚠️  Forcing shutdown after 10s timeout.");
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ── 4. Catch-all for truly unexpected errors ────────────────────
// These should never happen if the code is correct, but if they do,
// we log and exit rather than leaving the process in a broken state.

process.on("unhandledRejection", (reason: unknown) => {
  console.error("💥 UNHANDLED REJECTION:", reason);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err: Error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
  process.exit(1);
});
