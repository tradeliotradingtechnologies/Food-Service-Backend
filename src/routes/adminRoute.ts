import { Router } from "express";
import * as ctrl from "../controllers/adminController.js";
import { authenticate, authorize, requireRole } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  adminUpdateUserSchema,
  createPromoCodeSchema,
  promoCodeIdSchema,
  promoCodeQuerySchema,
  settingsKeySchema,
  updateCommissionSettingsSchema,
  updateOrderSettingsSchema,
  updatePaymentSettingsSchema,
  updatePromoCodeSchema,
  userQuerySchema,
  updateReservationSettingsSchema,
  updateProcessingFeeSchema,
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

// ── Audit Logs ───────────────────────────────────────────https://main.dylwj30bhegwe.amplifyapp.com/
router.get("/audit-logs", authorize("audit_log:read"), ctrl.getAuditLogs);

// ── Settings (super_admin only) ───────────────────────────────
router.get("/settings", authorize("setting:read"), ctrl.getAllSettings);
router.get("/settings/processing-fee", ctrl.getProcessingFee);
router.get(
  "/settings/:key",
  authorize("setting:read"),
  validate(settingsKeySchema),
  ctrl.getSettingsByKey,
);
router.patch(
  "/settings/orders",
  requireRole("super_admin"),
  validate(updateOrderSettingsSchema),
  ctrl.updateOrderSettings,
);
router.patch(
  "/settings/reservations",
  requireRole("super_admin"),
  validate(updateReservationSettingsSchema),
  ctrl.updateReservationSettings,
);
router.patch(
  "/settings/payments",
  requireRole("super_admin"),
  validate(updatePaymentSettingsSchema),
  ctrl.updatePaymentSettings,
);
router.patch(
  "/settings/processing-fee",
  requireRole("super_admin"),
  validate(updateProcessingFeeSchema),
  ctrl.updateProcessingFee,
);
router.get(
  "/settings/commission",
  requireRole("super_admin"),
  ctrl.getCommissionSettings,
);
router.patch(
  "/settings/commission",
  requireRole("super_admin"),
  validate(updateCommissionSettingsSchema),
  ctrl.updateCommissionSettings,
);
router.get(
  "/settings/commission/today",
  requireRole("super_admin"),
  ctrl.getTodayCommission,
);

router.post(
  "/settings/promo-codes",
  requireRole("super_admin"),
  validate(createPromoCodeSchema),
  ctrl.createPromoCode,
);
router.get(
  "/settings/promo-codes",
  requireRole("super_admin"),
  validate(promoCodeQuerySchema),
  ctrl.getPromoCodes,
);
router.get(
  "/settings/promo-codes/:id",
  requireRole("super_admin"),
  validate(promoCodeIdSchema),
  ctrl.getPromoCodeById,
);
router.patch(
  "/settings/promo-codes/:id",
  requireRole("super_admin"),
  validate(updatePromoCodeSchema),
  ctrl.updatePromoCode,
);
router.patch(
  "/settings/promo-codes/:id/invalidate",
  requireRole("super_admin"),
  validate(promoCodeIdSchema),
  ctrl.invalidatePromoCode,
);
router.delete(
  "/settings/promo-codes/:id",
  requireRole("super_admin"),
  validate(promoCodeIdSchema),
  ctrl.deletePromoCode,
);

export default router;
