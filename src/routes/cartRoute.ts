import { Router } from "express";
import * as ctrl from "../controllers/cartController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
} from "../schema/cartSchema.js";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.get("/", ctrl.getCart);
router.post("/items", validate(addToCartSchema), ctrl.addToCart);
router.patch(
  "/items/:menuItemId",
  validate(updateCartItemSchema),
  ctrl.updateCartItem,
);
router.delete(
  "/items/:menuItemId",
  validate(removeCartItemSchema),
  ctrl.removeFromCart,
);
router.delete("/", ctrl.clearCart);

export default router;
