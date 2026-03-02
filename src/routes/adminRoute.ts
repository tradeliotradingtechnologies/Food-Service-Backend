import { Router } from "express";
import * as ctrl from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  adminUpdateUserSchema,
  userQuerySchema,
} from "../schema/adminSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ── Profile (self) ──────────────────────────────────────────────
router.get("/profile", ctrl.getProfile);
router.patch("/profile", ctrl.updateProfile);
router.get("/profile/providers", ctrl.getLinkedProviders);

// ── User Management (admin) ─────────────────────────────────────
router.get(
  "/users",
  authorize("user:read"),
  validate(userQuerySchema),
  ctrl.getAllUsers,
);

router.get(
  "/users/:id",
  authorize("user:read"),
  validate(paramIdSchema),
  ctrl.getUserById,
);

router.patch(
  "/users/:id",
  authorize("user:update"),
  validate(adminUpdateUserSchema),
  ctrl.adminUpdateUser,
);

router.delete(
  "/users/:id",
  authorize("user:delete"),
  validate(paramIdSchema),
  ctrl.deactivateUser,
);

// ── Role & Permission Management ────────────────────────────────
router.get("/roles", authorize("setting:read"), ctrl.getAllRoles);
router.get(
  "/roles/:id",
  authorize("setting:read"),
  validate(paramIdSchema),
  ctrl.getRoleById,
);
router.patch(
  "/roles/:id/permissions",
  authorize("setting:update"),
  ctrl.updateRolePermissions,
);

router.get("/permissions", authorize("setting:read"), ctrl.getAllPermissions);

// ── Audit Logs ──────────────────────────────────────────────────
router.get("/audit-logs", authorize("audit_log:read"), ctrl.getAuditLogs);

export default router;
