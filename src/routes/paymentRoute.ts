import { Router } from "express";
import express from "express";
import * as ctrl from "../controllers/paymentController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { verifyPaystackWebhook } from "../middleware/paystackWebhook.js";
import validate from "../middleware/validate.js";
import {
  initiatePaymentSchema,
  initiatePaystackSchema,
  verifyPaystackSchema,
  confirmPaymentSchema,
  refundPaymentSchema,
} from "../schema/paymentSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// ── Paystack Webhook (NO auth, NO API key — uses HMAC signature) ─
// Must come BEFORE any body-parsing middleware. Uses express.raw()
// so we can verify the HMAC signature against the raw bytes.
router.post(
  "/webhook/paystack",
  express.raw({ type: "application/json" }),
  verifyPaystackWebhook,
  ctrl.paystackWebhook,
);

// All remaining payment routes require authentication
router.use(authenticate);

// ── Paystack ────────────────────────────────────────────────────
router.post(
  "/paystack/initialize",
  validate(initiatePaystackSchema),
  ctrl.initializePaystackPayment,
);

router.get(
  "/paystack/verify/:reference",
  validate(verifyPaystackSchema),
  ctrl.verifyPaystackPayment,
);

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
