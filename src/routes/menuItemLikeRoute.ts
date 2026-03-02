import { Router } from "express";
import * as ctrl from "../controllers/menuItemLikeController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { toggleLikeSchema } from "../schema/menuItemLikeSchema.js";

const router = Router();

// All like routes require authentication
router.use(authenticate);

router.get("/", ctrl.getUserLikes);
router.post("/:menuItemId", validate(toggleLikeSchema), ctrl.toggleLike);
router.get(
  "/:menuItemId/status",
  validate(toggleLikeSchema),
  ctrl.checkLikeStatus,
);

export default router;
