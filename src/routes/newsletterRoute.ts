import { Router } from "express";
import * as ctrl from "../controllers/newsletterController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  subscribeSchema,
  unsubscribeSchema,
} from "../schema/newsletterSchema.js";

const router = Router();

// ── Public ──────────────────────────────────────────────────────
router.post("/subscribe", validate(subscribeSchema), ctrl.subscribe);
router.post("/unsubscribe", validate(unsubscribeSchema), ctrl.unsubscribe);

// ── Admin ───────────────────────────────────────────────────────
router.use(authenticate);

router.get("/", authorize("newsletter:read"), ctrl.getAllSubscribers);

router.get("/count", authorize("newsletter:read"), ctrl.getSubscriberCount);

export default router;
