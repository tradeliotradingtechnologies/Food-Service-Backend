import { Router } from "express";
import {
  signup,
  login,
  logout,
  refreshAccessToken,
  googleAuth,
  appleAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateProfile,
  getMe,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { uploadAvatar } from "../utils/multer.js";
import {
  signupSchema,
  loginSchema,
  googleAuthSchema,
  appleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "../schema/userSchema.js";

const router = Router();

// ── Auth routes (public) ────────────────────────────────────────
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleAuthSchema), googleAuth);
router.post("/apple", validate(appleAuthSchema), appleAuth);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

// ── Email verification & password reset (public) ────────────────
router.get("/verify-email/:token", validate(verifyEmailSchema), verifyEmail);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.patch(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  resetPassword,
);

// ── Protected routes ────────────────────────────────────────────
router.get("/me", authenticate, getMe);
router.patch(
  "/update-password",
  authenticate,
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch(
  "/update-profile",
  authenticate,
  uploadAvatar,
  validate(updateProfileSchema),
  updateProfile,
);

export default router;
