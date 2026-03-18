import { Router } from "express";
import * as ctrl from "../controllers/extraItemsCategoryController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createExtraItemsCategorySchema,
  updateExtraItemsCategorySchema,
  extraItemsCategoryParamIdSchema,
} from "../schema/extraItemsCategorySchema.js";

const router = Router();

// Public read access for customers selecting extras
router.get("/", ctrl.getAllExtraItemsCategories);
router.get(
  "/:id",
  validate(extraItemsCategoryParamIdSchema),
  ctrl.getExtraItemsCategoryById,
);

// Admin / Staff writes only
router.use(authenticate);
router.use(requireRole("super_admin", "admin", "staff"));

router.post(
  "/",
  validate(createExtraItemsCategorySchema),
  ctrl.createExtraItemsCategory,
);
router.patch(
  "/:id",
  validate(updateExtraItemsCategorySchema),
  ctrl.updateExtraItemsCategory,
);
router.delete(
  "/:id",
  validate(extraItemsCategoryParamIdSchema),
  ctrl.deleteExtraItemsCategory,
);

export default router;
