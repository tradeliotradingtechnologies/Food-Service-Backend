import Permission from "../models/permissionModel.js";
import type {
  PermissionResource,
  PermissionAction,
} from "../types/model.types.js";

interface PermissionSeed {
  name: string;
  description: string;
  resource: PermissionResource;
  action: PermissionAction;
}

const permissions: PermissionSeed[] = [
  // ── Menu ──────────────────────────────────
  {
    name: "menu:create",
    description: "Create menu items",
    resource: "menu",
    action: "create",
  },
  {
    name: "menu:read",
    description: "View menu items",
    resource: "menu",
    action: "read",
  },
  {
    name: "menu:update",
    description: "Update menu items",
    resource: "menu",
    action: "update",
  },
  {
    name: "menu:delete",
    description: "Delete menu items",
    resource: "menu",
    action: "delete",
  },
  {
    name: "menu:manage",
    description: "Full menu management",
    resource: "menu",
    action: "manage",
  },

  // ── Category ──────────────────────────────
  {
    name: "category:create",
    description: "Create categories",
    resource: "category",
    action: "create",
  },
  {
    name: "category:read",
    description: "View categories",
    resource: "category",
    action: "read",
  },
  {
    name: "category:update",
    description: "Update categories",
    resource: "category",
    action: "update",
  },
  {
    name: "category:delete",
    description: "Delete categories",
    resource: "category",
    action: "delete",
  },

  // ── Order ─────────────────────────────────
  {
    name: "order:create",
    description: "Create orders",
    resource: "order",
    action: "create",
  },
  {
    name: "order:read",
    description: "View orders",
    resource: "order",
    action: "read",
  },
  {
    name: "order:update",
    description: "Update orders",
    resource: "order",
    action: "update",
  },
  {
    name: "order:delete",
    description: "Delete orders",
    resource: "order",
    action: "delete",
  },
  {
    name: "order:manage",
    description: "Full order management (assign, cancel any)",
    resource: "order",
    action: "manage",
  },

  // ── User ──────────────────────────────────
  {
    name: "user:create",
    description: "Create users",
    resource: "user",
    action: "create",
  },
  {
    name: "user:read",
    description: "View user profiles",
    resource: "user",
    action: "read",
  },
  {
    name: "user:update",
    description: "Update user profiles",
    resource: "user",
    action: "update",
  },
  {
    name: "user:delete",
    description: "Delete users (soft)",
    resource: "user",
    action: "delete",
  },
  {
    name: "user:manage",
    description: "Full user management (roles, activation)",
    resource: "user",
    action: "manage",
  },

  // ── Testimonial ───────────────────────────
  {
    name: "testimonial:create",
    description: "Create testimonials",
    resource: "testimonial",
    action: "create",
  },
  {
    name: "testimonial:read",
    description: "View testimonials",
    resource: "testimonial",
    action: "read",
  },
  {
    name: "testimonial:update",
    description: "Update testimonials",
    resource: "testimonial",
    action: "update",
  },
  {
    name: "testimonial:delete",
    description: "Delete testimonials",
    resource: "testimonial",
    action: "delete",
  },

  // ── Daily Special ─────────────────────────
  {
    name: "daily_special:create",
    description: "Create daily specials",
    resource: "daily_special",
    action: "create",
  },
  {
    name: "daily_special:read",
    description: "View daily specials",
    resource: "daily_special",
    action: "read",
  },
  {
    name: "daily_special:update",
    description: "Update daily specials",
    resource: "daily_special",
    action: "update",
  },
  {
    name: "daily_special:delete",
    description: "Delete daily specials",
    resource: "daily_special",
    action: "delete",
  },

  // ── Payment ───────────────────────────────
  {
    name: "payment:read",
    description: "View payment records",
    resource: "payment",
    action: "read",
  },
  {
    name: "payment:manage",
    description: "Manage payments (refunds)",
    resource: "payment",
    action: "manage",
  },

  // ── Report ────────────────────────────────
  {
    name: "report:read",
    description: "View reports and analytics",
    resource: "report",
    action: "read",
  },

  // ── Setting ───────────────────────────────
  {
    name: "setting:manage",
    description: "Manage application settings",
    resource: "setting",
    action: "manage",
  },

  // ── Auth / OAuth ──────────────────────────
  {
    name: "auth:manage",
    description: "Manage authentication settings",
    resource: "auth",
    action: "manage",
  },
  {
    name: "oauth:manage",
    description: "Manage OAuth provider connections",
    resource: "oauth",
    action: "manage",
  },
];

export async function seedPermissions(): Promise<void> {
  console.log("🌱 Seeding permissions...");

  let created = 0;
  let skipped = 0;

  for (const perm of permissions) {
    const exists = await Permission.findOne({ name: perm.name });
    if (exists) {
      skipped++;
      continue;
    }
    await Permission.create(perm);
    created++;
  }

  console.log(
    `✅ Permissions seeded: ${created} created, ${skipped} already existed (${permissions.length} total)`,
  );
}

export default seedPermissions;
