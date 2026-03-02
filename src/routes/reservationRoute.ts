import { Router } from "express";
import * as ctrl from "../controllers/reservationController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createReservationSchema,
  updateReservationSchema,
  updateReservationStatusSchema,
  reservationQuerySchema,
  cancelReservationSchema,
} from "../schema/reservationSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// ── Public: create a reservation (guests don't need auth) ───────
router.post("/", validate(createReservationSchema), ctrl.createReservation);

// ── Authenticated ───────────────────────────────────────────────
router.use(authenticate);

// Customer: view own reservations
router.get("/my", ctrl.getUserReservations);

// Cancel reservation (customer own or admin any)
router.post(
  "/:id/cancel",
  validate(cancelReservationSchema),
  ctrl.cancelReservation,
);

// ── Admin / Staff ───────────────────────────────────────────────
router.get(
  "/",
  authorize("reservation:read"),
  validate(reservationQuerySchema),
  ctrl.getAllReservations,
);

router.get(
  "/upcoming",
  authorize("reservation:read"),
  ctrl.getUpcomingReservations,
);

router.get(
  "/:id",
  authorize("reservation:read"),
  validate(paramIdSchema),
  ctrl.getReservationById,
);

router.patch(
  "/:id",
  authorize("reservation:update"),
  validate(updateReservationSchema),
  ctrl.updateReservation,
);

router.patch(
  "/:id/status",
  authorize("reservation:update"),
  validate(updateReservationStatusSchema),
  ctrl.updateReservationStatus,
);

router.delete(
  "/:id",
  authorize("reservation:delete"),
  validate(paramIdSchema),
  ctrl.deleteReservation,
);

export default router;
