import { Router } from "express";
import * as ctrl from "../controllers/analyticsController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  salesQuerySchema,
  orderAnalyticsQuerySchema,
  customerAnalyticsQuerySchema,
  menuPerformanceQuerySchema,
  revenueChartQuerySchema,
  reservationAnalyticsQuerySchema,
} from "../schema/analyticsSchema.js";

const router = Router();

// All analytics routes require authentication + report:read permission
router.use(authenticate);
router.use(authorize("report:read"));

// ── Dashboard ───────────────────────────────────────────────────
router.get("/dashboard", ctrl.getDashboardOverview);

// ── Revenue Chart ───────────────────────────────────────────────
router.get(
  "/revenue-chart",
  validate(revenueChartQuerySchema),
  ctrl.getRevenueChart,
);

// ── Sales ───────────────────────────────────────────────────────
router.get("/sales", validate(salesQuerySchema), ctrl.getSalesAnalytics);

// ── Orders ──────────────────────────────────────────────────────
router.get(
  "/orders",
  validate(orderAnalyticsQuerySchema),
  ctrl.getOrderAnalytics,
);

// ── Customers ───────────────────────────────────────────────────
router.get(
  "/customers",
  validate(customerAnalyticsQuerySchema),
  ctrl.getCustomerAnalytics,
);

// ── Menu Performance ────────────────────────────────────────────
router.get(
  "/menu-performance",
  validate(menuPerformanceQuerySchema),
  ctrl.getMenuPerformance,
);

// ── Recent Activity ─────────────────────────────────────────────
router.get("/recent-activity", ctrl.getRecentActivity);

// ── Reservation Analytics ───────────────────────────────────────
router.get(
  "/reservations",
  validate(reservationAnalyticsQuerySchema),
  ctrl.getReservationAnalytics,
);

export default router;
