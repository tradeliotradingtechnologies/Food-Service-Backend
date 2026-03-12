import { Router } from "express";
import * as ctrl from "../controllers/orderController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  confirmAllOrdersSchema,
  assignRiderSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from "../schema/orderSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// All order routes require authentication
router.use(authenticate);

// ── Customer routes ─────────────────────────────────────────────
router.post("/", validate(createOrderSchema), ctrl.createOrder);
router.get("/my", validate(orderQuerySchema), ctrl.getUserOrders);
router.get("/:id", validate(paramIdSchema), ctrl.getOrderById);
router.post("/:id/cancel", validate(cancelOrderSchema), ctrl.cancelOrder);

// ── Admin / Staff routes ────────────────────────────────────────
router.get(
  "/",
  authorize("order:read"),
  validate(orderQuerySchema),
  ctrl.getAllOrders,
);

router.patch(
  "/confirm-all",
  authorize("order:update"),
  validate(confirmAllOrdersSchema),
  ctrl.confirmAllOrders,
);

router.patch(
  "/:id/status",
  authorize("order:update"),
  validate(updateOrderStatusSchema),
  ctrl.updateOrderStatus,
);

router.patch(
  "/:id/assign-rider",
  authorize("order:update"),
  validate(assignRiderSchema),
  ctrl.assignRider,
);

export default router;
