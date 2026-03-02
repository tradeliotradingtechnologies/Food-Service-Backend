import seedPermissions from "./permissionSeeder.js";
import seedRoles from "./roleSeeder.js";

/**
 * Run all database seeders in order.
 * Call this after MongoDB connection is established.
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
