import { Router } from "express";
import {
  signup,
  login,
  logout,
  refreshAccessToken,
  googleAuth,
  appleAuth,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  signupSchema,
  loginSchema,
  googleAuthSchema,
  appleAuthSchema,
} from "../schema/userSchema.js";

const router = Router();

// ── Auth routes (public) ────────────────────────────────────────
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleAuthSchema), googleAuth);
router.post("/apple", validate(appleAuthSchema), appleAuth);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

// ── Protected test route ────────────────────────────────────────
router.get("/test", authenticate, (req, res) => {
  res.json({ message: "User route is working!", user: req.user?.name });
});

export default router;
