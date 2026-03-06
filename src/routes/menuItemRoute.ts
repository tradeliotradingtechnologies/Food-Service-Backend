import { Router } from "express";
import * as ctrl from "../controllers/menuItemController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { uploadMultiple } from "../utils/multer.js";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  menuItemQuerySchema,
} from "../schema/menuItemSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// ── Public ──────────────────────────────────────────────────────
router.get("/", validate(menuItemQuerySchema), ctrl.getMenuItems);
router.get("/:id", validate(paramIdSchema), ctrl.getMenuItemById);
router.get("/slug/:slug", ctrl.getMenuItemBySlug);

// ── Admin / Staff ───────────────────────────────────────────────
router.use(authenticate);

router.post(
  "/",
  authorize("menu:create"),
  uploadMultiple,
  validate(createMenuItemSchema),
  ctrl.createMenuItem,
);

router.patch(
  "/:id",
  authorize("menu:update"),
  uploadMultiple,
  validate(updateMenuItemSchema),
  ctrl.updateMenuItem,
);

router.delete(
  "/:id",
  authorize("menu:delete"),
  validate(paramIdSchema),
  ctrl.deleteMenuItem,
);

export default router;
