import { Router } from "express";
import * as ctrl from "../controllers/paymentController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  initiatePaymentSchema,
  confirmPaymentSchema,
  refundPaymentSchema,
} from "../schema/paymentSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// ── Customer ────────────────────────────────────────────────────
router.post("/", validate(initiatePaymentSchema), ctrl.initiatePayment);
router.get("/my", ctrl.getUserPayments);
router.get("/order/:orderId", ctrl.getPaymentByOrder);

// ── Admin / Staff ───────────────────────────────────────────────
router.patch(
  "/:id/confirm",
  authorize("payment:update"),
  validate(confirmPaymentSchema),
  ctrl.confirmPayment,
);

router.patch(
  "/:id/fail",
  authorize("payment:update"),
  validate(paramIdSchema),
  ctrl.failPayment,
);

router.post(
  "/:id/refund",
  authorize("payment:update"),
  validate(refundPaymentSchema),
  ctrl.refundPayment,
);

export default router;
