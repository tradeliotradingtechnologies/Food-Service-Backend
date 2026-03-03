import seedPermissions from "./permissionSeeder.js";
import seedRoles from "./roleSeeder.js";
export { default as seedData } from "./dataSeeder.js";

/**
 * Run all database seeders in order.
 * Call this after MongoDB connection is established.
 *
 * NOTE: This only seeds permissions & roles (idempotent).
 * For full sample data, use `npm run seed` or `npm run seed:reset`.
 */
export async function runSeeders(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Running database seeders...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Order matters: permissions first, then roles (which reference permissions)
  await seedPermissions();
  await seedRoles();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ All seeders completed");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

export default runSeeders;
