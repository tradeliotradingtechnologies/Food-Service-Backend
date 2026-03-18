import { Router } from "express";
import * as ctrl from "../controllers/extraItemsController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createExtraItemSchema,
  updateExtraItemSchema,
  extraItemQuerySchema,
  extraItemParamIdSchema,
} from "../schema/extraItemsSchema.js";

const router = Router();

// Public read access for customers selecting extras
router.get("/", validate(extraItemQuerySchema), ctrl.getExtraItems);
router.get("/:id", validate(extraItemParamIdSchema), ctrl.getExtraItemById);

// Admin / Staff writes only
router.use(authenticate);
router.use(requireRole("super_admin", "admin", "staff"));

router.post("/", validate(createExtraItemSchema), ctrl.createExtraItem);
router.patch("/:id", validate(updateExtraItemSchema), ctrl.updateExtraItem);
router.delete("/:id", validate(extraItemParamIdSchema), ctrl.deleteExtraItem);

export default router;
