import { Router } from "express";
import * as ctrl from "../controllers/testimonialController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  moderateTestimonialSchema,
} from "../schema/testimonialSchema.js";
import { paramIdSchema } from "../schema/categorySchema.js";

const router = Router();

// ── Public ──────────────────────────────────────────────────────
router.get("/approved", ctrl.getApprovedTestimonials);
router.get("/featured", ctrl.getFeaturedTestimonials);

// ── Authenticated ───────────────────────────────────────────────
router.use(authenticate);

router.post("/", validate(createTestimonialSchema), ctrl.createTestimonial);
router.get("/my", ctrl.getUserTestimonials);
router.patch("/:id", validate(updateTestimonialSchema), ctrl.updateTestimonial);
router.delete("/:id", validate(paramIdSchema), ctrl.deleteTestimonial);

// ── Admin ───────────────────────────────────────────────────────
router.get("/", authorize("testimonial:read"), ctrl.getAllTestimonials);

router.patch(
  "/:id/moderate",
  authorize("testimonial:update"),
  validate(moderateTestimonialSchema),
  ctrl.moderateTestimonial,
);

export default router;
