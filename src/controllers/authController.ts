import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/userModel.js";
import Role from "../models/roleModel.js";
import RefreshToken from "../models/refreshTokenModel.js";
import OAuthAccount from "../models/oauthAccountModel.js";
import AuditLog from "../models/auditLogModel.js";
import jwt from "jsonwebtoken";

// ── Token helpers ────────────────────────────────────────────────

const signAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as any,
  });
};

const signRefreshTokenJWT = (userId: string, family: string): string => {
  return jwt.sign({ id: userId, family }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as any,
  });
};

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const createSendTokens = async (
  user: any,
  res: Response,
  req: Request,
): Promise<void> => {
  const accessToken = signAccessToken(user._id.toString());

  // Create refresh token family
  const family = crypto.randomUUID();
  const rawRefreshToken = signRefreshTokenJWT(user._id.toString(), family);

  // Store hashed refresh token
  await RefreshToken.create({
    user: user._id,
    token: hashToken(rawRefreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  // Set HTTP-only cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", rawRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth/refresh", // Only sent to refresh endpoint
  });
};

// ── Signup ────────────────────────────────────────────────────────

export const signup = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, passwordConfirm, phoneNumber } = req.body;

  // Get the default "customer" role
  const defaultRole = await Role.findOne({ isDefault: true });
  if (!defaultRole) {
    throw new AppError("Default role not configured. Run seeders first.", 500);
  }

  const user = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    phoneNumber,
    authMethod: "local",
    role: defaultRole._id,
  });

  await createSendTokens(user, res, req);

  // Audit log
  await AuditLog.create({
    actor: user._id,
    action: "auth.signup",
    resource: "user",
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    status: "success",
  });

  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;

  res.status(201).json({
    status: "success",
    message: "User signed up successfully",
    data: { user: userObj },
  });
});

// ── Login ─────────────────────────────────────────────────────────

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    const user = await User.findOne({ email, active: true }).select(
      "+password",
    );

    if (!user || user.authMethod === "google" || user.authMethod === "apple") {
      return next(
        new AppError("Invalid credentials or use OAuth to sign in", 401),
      );
    }

    // Check account lock
    if (user.isLocked()) {
      return next(
        new AppError(
          "Account temporarily locked due to too many failed attempts. Try again later.",
          423,
        ),
      );
    }

    const isCorrect = await user.correctPassword(password, user.password!);

    if (!isCorrect) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock 15 min
      }
      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        actor: user._id,
        action: "auth.login",
        resource: "user",
        resourceId: user._id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        status: "failure",
      });

      return next(new AppError("Incorrect email or password", 401));
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save({ validateBeforeSave: false });

    await createSendTokens(user, res, req);

    await AuditLog.create({
      actor: user._id,
      action: "auth.login",
      resource: "user",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success",
    });

    res.status(200).json({
      status: "success",
      message: "Logged in successfully",
    });
  },
);

// ── Refresh Token ─────────────────────────────────────────────────

export const refreshAccessToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) {
      return next(new AppError("No refresh token provided", 401));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(rawToken, process.env.JWT_REFRESH_SECRET!);
    } catch {
      return next(new AppError("Invalid or expired refresh token", 401));
    }

    const hashedToken = hashToken(rawToken);
    const storedToken = await RefreshToken.findOne({ token: hashedToken });

    if (!storedToken) {
      return next(new AppError("Refresh token not found", 401));
    }

    // Token reuse detection → revoke entire family
    if (storedToken.revoked) {
      await RefreshToken.updateMany(
        { family: storedToken.family },
        { revoked: true, revokedAt: new Date() },
      );
      return next(
        new AppError(
          "Token reuse detected. All sessions revoked for security.",
          401,
        ),
      );
    }

    // Revoke current token
    storedToken.revoked = true;
    storedToken.revokedAt = new Date();

    // Issue new pair
    const newAccessToken = signAccessToken(decoded.id);
    const newRawRefresh = signRefreshTokenJWT(decoded.id, storedToken.family);

    storedToken.replacedBy = hashToken(newRawRefresh);
    await storedToken.save();

    await RefreshToken.create({
      user: decoded.id,
      token: hashToken(newRawRefresh),
      family: storedToken.family,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
    };

    res.cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRawRefresh, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh",
    });

    res.status(200).json({
      status: "success",
      message: "Token refreshed",
    });
  },
);

// ── Logout ────────────────────────────────────────────────────────

export const logout = catchAsync(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const hashedToken = hashToken(rawToken);
    await RefreshToken.findOneAndUpdate(
      { token: hashedToken },
      { revoked: true, revokedAt: new Date() },
    );
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

// ── Google OAuth ──────────────────────────────────────────────────

export const googleAuth = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { idToken } = req.body;

    if (!idToken) {
      return next(new AppError("Google ID token is required", 400));
    }

    // Dynamically import google-auth-library
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch {
      return next(new AppError("Invalid Google ID token", 401));
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return next(new AppError("Unable to verify Google identity", 401));
    }

    const { sub: providerId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return next(new AppError("Google email is not verified", 401));
    }

    // Check if OAuth account already linked
    let oauthAccount = await OAuthAccount.findOne({
      provider: "google",
      providerId,
    });

    let user;

    if (oauthAccount) {
      // Existing OAuth link → load user
      user = await User.findById(oauthAccount.user);
      if (!user || !user.active) {
        return next(new AppError("Account is deactivated", 401));
      }
    } else {
      // Check if a user with this email already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Link Google to existing account
        oauthAccount = await OAuthAccount.create({
          user: existingUser._id,
          provider: "google",
          providerId,
          email,
          displayName: name,
          avatar: picture,
        });

        existingUser.authMethod =
          existingUser.authMethod === "local"
            ? "mixed"
            : existingUser.authMethod;
        if (!existingUser.avatar && picture) existingUser.avatar = picture;
        existingUser.emailVerified = true;
        await existingUser.save({ validateBeforeSave: false });

        user = existingUser;
      } else {
        // Create a brand-new user
        const defaultRole = await Role.findOne({ isDefault: true });
        if (!defaultRole) {
          return next(
            new AppError(
              "Default role not configured. Run seeders first.",
              500,
            ),
          );
        }

        user = await User.create({
          name: name || email!.split("@")[0],
          email,
          authMethod: "google",
          role: defaultRole._id,
          avatar: picture,
          emailVerified: true,
        });

        oauthAccount = await OAuthAccount.create({
          user: user._id,
          provider: "google",
          providerId,
          email,
          displayName: name,
          avatar: picture,
        });
      }
    }

    // Update login info
    user!.lastLoginAt = new Date();
    user!.lastLoginIp = req.ip;
    await user!.save({ validateBeforeSave: false });

    await createSendTokens(user!, res, req);

    await AuditLog.create({
      actor: user!._id,
      action:
        oauthAccount!.createdAt.getTime() === oauthAccount!.updatedAt.getTime()
          ? "auth.google_signup"
          : "auth.google_login",
      resource: "user",
      resourceId: user!._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success",
    });

    res.status(200).json({
      status: "success",
      message: "Google authentication successful",
    });
  },
);

// ── Apple OAuth ───────────────────────────────────────────────────

export const appleAuth = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { identityToken, user: appleUser } = req.body;

    if (!identityToken) {
      return next(new AppError("Apple identity token is required", 400));
    }

    // Dynamically import apple-signin-auth
    const appleSignin = await import("apple-signin-auth");

    let applePayload;
    try {
      applePayload = await appleSignin.default.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false,
      });
    } catch {
      return next(new AppError("Invalid Apple identity token", 401));
    }

    const { sub: providerId, email } = applePayload;

    // Check existing OAuth link
    let oauthAccount = await OAuthAccount.findOne({
      provider: "apple",
      providerId,
    });

    let user;

    if (oauthAccount) {
      user = await User.findById(oauthAccount.user);
      if (!user || !user.active) {
        return next(new AppError("Account is deactivated", 401));
      }
    } else {
      // Apple sends name only on first authorization
      const firstName = appleUser?.name?.firstName || "";
      const lastName = appleUser?.name?.lastName || "";
      const displayName = `${firstName} ${lastName}`.trim();

      const existingUser = email ? await User.findOne({ email }) : null;

      if (existingUser) {
        oauthAccount = await OAuthAccount.create({
          user: existingUser._id,
          provider: "apple",
          providerId,
          email,
          displayName: displayName || undefined,
        });

        existingUser.authMethod =
          existingUser.authMethod === "local"
            ? "mixed"
            : existingUser.authMethod;
        existingUser.emailVerified = true;
        await existingUser.save({ validateBeforeSave: false });

        user = existingUser;
      } else {
        const defaultRole = await Role.findOne({ isDefault: true });
        if (!defaultRole) {
          return next(
            new AppError(
              "Default role not configured. Run seeders first.",
              500,
            ),
          );
        }

        user = await User.create({
          name: displayName || email?.split("@")[0] || "Apple User",
          email: email || `${providerId}@privaterelay.appleid.com`,
          authMethod: "apple",
          role: defaultRole._id,
          emailVerified: true,
        });

        oauthAccount = await OAuthAccount.create({
          user: user._id,
          provider: "apple",
          providerId,
          email,
          displayName: displayName || undefined,
        });
      }
    }

    user!.lastLoginAt = new Date();
    user!.lastLoginIp = req.ip;
    await user!.save({ validateBeforeSave: false });

    await createSendTokens(user!, res, req);

    await AuditLog.create({
      actor: user!._id,
      action:
        oauthAccount!.createdAt.getTime() === oauthAccount!.updatedAt.getTime()
          ? "auth.apple_signup"
          : "auth.apple_login",
      resource: "user",
      resourceId: user!._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success",
    });

    res.status(200).json({
      status: "success",
      message: "Apple authentication successful",
    });
  },
);
