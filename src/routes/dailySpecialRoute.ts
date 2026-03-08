import { Router } from "express";
import * as ctrl from "../controllers/dailySpecialController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createDailySpecialSchema,
  updateDailySpecialSchema,
} from "../schema/dailySpecialSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// ── Public ──────────────────────────────────────────────────────
router.get("/today", ctrl.getTodaySpecials);
router.get("/by-date", ctrl.getDailySpecialsByDate);
router.get("/", ctrl.getAllDailySpecials);
router.get("/:id", validate(paramIdSchema), ctrl.getDailySpecialById);

// ── Admin / Staff ───────────────────────────────────────────────
router.use(authenticate);

router.post(
  "/",
  authorize("daily_special:create"),
  validate(createDailySpecialSchema),
  ctrl.createDailySpecial,
);

router.patch(
  "/:id",
  authorize("daily_special:update"),
  validate(updateDailySpecialSchema),
  ctrl.updateDailySpecial,
);

router.delete(
  "/:id",
  authorize("daily_special:delete"),
  validate(paramIdSchema),
  ctrl.deleteDailySpecial,
);

export default router;
