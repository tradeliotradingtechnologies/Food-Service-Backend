import Role from "../models/roleModel.js";
import Permission from "../models/permissionModel.js";
import type { RoleName } from "../types/model.types.js";

interface RoleSeed {
  name: RoleName;
  description: string;
  isDefault: boolean;
  isSystem: boolean;
  permissionNames: string[];
}

const roles: RoleSeed[] = [
  {
    name: "super_admin",
    description: "Full system access — all permissions",
    isDefault: false,
    isSystem: true,
    permissionNames: ["*"], // Special: gets ALL permissions
  },
  {
    name: "admin",
    description: "Restaurant management — menu, orders, users, reports",
    isDefault: false,
    isSystem: true,
    permissionNames: [
      "menu:create",
      "menu:read",
      "menu:update",
      "menu:delete",
      "menu:manage",
      "category:create",
      "category:read",
      "category:update",
      "category:delete",
      "order:read",
      "order:update",
      "order:manage",
      "user:read",
      "user:update",
      "testimonial:create",
      "testimonial:read",
      "testimonial:update",
      "testimonial:delete",
      "daily_special:create",
      "daily_special:read",
      "daily_special:update",
      "daily_special:delete",
      "payment:read",
      "payment:manage",
      "report:read",
      "setting:manage",
      "reservation:create",
      "reservation:read",
      "reservation:update",
      "reservation:delete",
      "analytics:read",
    ],
  },
  {
    name: "staff",
    description:
      "Kitchen and front-of-house staff — read menus and manage orders",
    isDefault: false,
    isSystem: true,
    permissionNames: [
      "menu:read",
      "category:read",
      "order:read",
      "order:update",
      "daily_special:read",
      "reservation:read",
      "reservation:update",
    ],
  },
  {
    name: "delivery_rider",
    description: "Delivery personnel — view and update assigned orders",
    isDefault: false,
    isSystem: true,
    permissionNames: ["order:read", "order:update"],
  },
  {
    name: "customer",
    description: "Regular customer — browse menu, place orders, write reviews",
    isDefault: true,
    isSystem: true,
    permissionNames: [
      "menu:read",
      "category:read",
      "order:create",
      "order:read",
      "testimonial:create",
      "daily_special:read",
    ],
  },
];

export async function seedRoles(): Promise<void> {
  console.log("🌱 Seeding roles...");

  // Fetch all permissions once
  const allPermissions = await Permission.find();
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p._id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const roleSeed of roles) {
    // Resolve permission names → ObjectIds
    let permissionIds: (typeof allPermissions)[number]["_id"][];

    if (roleSeed.permissionNames.includes("*")) {
      // Super admin gets everything
      permissionIds = allPermissions.map((p) => p._id);
    } else {
      permissionIds = roleSeed.permissionNames
        .map((name) => permissionMap.get(name))
        .filter(Boolean) as typeof permissionIds;
    }

    const existing = await Role.findOne({ name: roleSeed.name });

    if (existing) {
      // Update permissions if they changed
      const existingIds = existing.permissions
        .map((id) => id.toString())
        .sort();
      const newIds = permissionIds.map((id) => id.toString()).sort();

      if (JSON.stringify(existingIds) !== JSON.stringify(newIds)) {
        existing.permissions = permissionIds;
        existing.description = roleSeed.description;
        await existing.save();
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    await Role.create({
      name: roleSeed.name,
      description: roleSeed.description,
      permissions: permissionIds,
      isDefault: roleSeed.isDefault,
      isSystem: roleSeed.isSystem,
    });
    created++;
  }

  console.log(
    `✅ Roles seeded: ${created} created, ${updated} updated, ${skipped} unchanged (${roles.length} total)`,
  );
}

export default seedRoles;
