import { Router } from "express";
import * as ctrl from "../controllers/categoryController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createCategorySchema,
  updateCategorySchema,
  paramIdSchema,
} from "../schema/categorySchema.js";

const router = Router();

// ── Public ──────────────────────────────────────────────────────
router.get("/", ctrl.getAllCategories);
router.get("/:id", validate(paramIdSchema), ctrl.getCategoryById);
router.get("/slug/:slug", ctrl.getCategoryBySlug);

// ── Admin / Staff ───────────────────────────────────────────────
router.use(authenticate);

router.post(
  "/",
  authorize("category:create"),
  validate(createCategorySchema),
  ctrl.createCategory,
);

router.patch(
  "/:id",
  authorize("category:update"),
  validate(updateCategorySchema),
  ctrl.updateCategory,
);

router.delete(
  "/:id",
  authorize("category:delete"),
  validate(paramIdSchema),
  ctrl.deleteCategory,
);

export default router;
