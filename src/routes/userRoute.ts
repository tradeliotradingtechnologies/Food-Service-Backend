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
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  signupSchema,
  loginSchema,
  googleAuthSchema,
  appleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
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

// ── Protected test route ────────────────────────────────────────
router.get("/test", authenticate, (req, res) => {
  res.json({ message: "User route is working!", user: req.user?.name });
});

export default router;
