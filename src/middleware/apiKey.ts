import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import AppError from "../utils/appError.js";

/**
 * API Key Gate — first layer of defence.
 *
 * Every request to `/api/*` must include a valid `X-API-Key` header.
 * This ensures only known clients (your frontend, mobile app) can reach
 * the API at all — before JWT auth even runs.
 *
 * Webhook endpoints are exempt — they authenticate via provider-specific
 * HMAC signatures instead of an API key.
 *
 * The key is compared in constant-time via `timingSafeEqual` to prevent
 * timing-based side-channel attacks.
 */

// Paths that are exempt from API key checks (public/read-only or webhook auth)
const EXEMPT_PATHS = ["/api/v1/payments/webhook/paystack"];

export const requireApiKey = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Skip API key check for webhook endpoints
  if (EXEMPT_PATHS.some((path) => req.originalUrl.startsWith(path))) {
    return next();
  }

  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    return next(new AppError("Missing API key", 401));
  }

  const serverKey = process.env.API_KEY;
  if (!serverKey) {
    // Fail closed — if the server key is not configured, reject everything
    console.error("⚠️  API_KEY is not set in environment variables");
    return next(new AppError("Server configuration error", 500));
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeCompare(apiKey, serverKey)) {
    return next(new AppError("Invalid API key", 401));
  }

  next();
};

/**
 * Constant-time string comparison using Node's crypto.timingSafeEqual.
 * Returns false (instead of throwing) when lengths differ.
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Compare against itself so the time is still constant,
    // then return false to avoid leaking length info.
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
