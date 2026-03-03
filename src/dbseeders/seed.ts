/**
 * CLI Seed Runner
 * ─────────────────────────────────────────────────────────
 * Usage:
 *   npx tsx src/dbseeders/seed.ts          # Seed data (additive)
 *   npx tsx src/dbseeders/seed.ts --reset   # Drop all collections, re-seed everything
 *   npx tsx src/dbseeders/seed.ts --fresh   # Alias for --reset
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import seedPermissions from "./permissionSeeder.js";
import seedRoles from "./roleSeeder.js";
import seedData from "./dataSeeder.js";

dotenv.config();

const DB_URI = process.env.DB_URI!;
if (!DB_URI) {
  console.error("❌ DB_URI environment variable is not set.");
  process.exit(1);
}

const args = process.argv.slice(2);
const isReset = args.includes("--reset") || args.includes("--fresh");

async function resetDatabase(): Promise<void> {
  console.log("🗑️  Dropping all collections...");

  const collections = await mongoose.connection.db!.listCollections().toArray();

  for (const { name } of collections) {
    await mongoose.connection.db!.dropCollection(name);
    console.log(`  🗑️  Dropped: ${name}`);
  }

  console.log(`  ✅ ${collections.length} collections dropped\n`);
}

async function run(): Promise<void> {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🌱 Seed Runner — ${isReset ? "RESET + SEED" : "SEED"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.connect(DB_URI);
    console.log("📦 Connected to MongoDB\n");

    if (isReset) {
      await resetDatabase();
    }

    // Phase 1: Core seeders (idempotent — safe to re-run)
    await seedPermissions();
    await seedRoles();

    // Phase 2: Sample data
    await seedData();

    console.log("\n🏁 Seed runner finished.");
  } catch (err) {
    console.error("❌ Seed runner failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📦 Disconnected from MongoDB");
  }
}

run();
