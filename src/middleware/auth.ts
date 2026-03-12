import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authenticate: verify JWT access token and attach user to request.
 */
export const authenticate = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    // 1) Get token from cookie or Authorization header
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError(
          "You are not logged in. Please log in to get access.",
          401,
        ),
      );
    }

    // 2) Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return next(new AppError("Invalid or expired token", 401));
    }

    // 3) Check if user still exists
    const user = await User.findById(decoded.id).populate({
      path: "role",
      populate: { path: "permissions", select: "name" },
    });

    if (!user || !user.active) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401),
      );
    }

    // 4) Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "Password was recently changed. Please log in again.",
          401,
        ),
      );
    }

    // 5) Check account lock
    if (user.isLocked()) {
      return next(new AppError("Account is temporarily locked.", 423));
    }

    req.user = user;
    next();
  },
);

/**
 * RequireRole: restrict access to users with one of the specified role names.
 * Usage: requireRole("super_admin")
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roleName = (req.user?.role as any)?.name;
    if (!roleName || !roles.includes(roleName)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};

/**
 * Authorize: check if user's role has the required permissions.
 * Usage: authorize("menu:create", "menu:update")
 */
export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new AppError("User not authenticated", 401));
    }

    // Super admin bypass
    const role = user.role as any;
    if (role?.name === "super_admin") {
      return next();
    }

    // Extract permission names from populated role
    const userPermissions: string[] =
      role?.permissions?.map((p: any) => p.name || p) || [];

    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }

    next();
  };
};
