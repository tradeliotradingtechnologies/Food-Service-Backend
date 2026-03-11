import { Request, Response, NextFunction } from "express";
import { verifyWebhookSignature } from "../services/paystackService.js";
import AppError from "../utils/appError.js";

/**
 * Paystack Webhook Signature Verification Middleware
 *
 * Paystack signs every webhook payload with an HMAC-SHA512 hash
 * using your secret key. The signature is sent in `x-paystack-signature`.
 *
 * This middleware:
 * 1. Reads the raw body (requires express.raw() on the webhook route)
 * 2. Verifies the HMAC signature
 * 3. Parses the JSON body and attaches it to req.body
 * 4. Rejects requests with invalid or missing signatures
 *
 * IMPORTANT: The webhook route must use `express.raw({ type: 'application/json' })`
 * instead of `express.json()` so we get the raw buffer for HMAC verification.
 */
export const verifyPaystackWebhook = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const signature = req.headers["x-paystack-signature"] as string | undefined;

  if (!signature) {
    return next(new AppError("Missing Paystack webhook signature", 401));
  }

  // req.body is a raw Buffer when express.raw() is used
  const rawBody = req.body as Buffer;

  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return next(
      new AppError("Webhook body must be raw — check middleware order", 400),
    );
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    return next(new AppError("Invalid webhook signature", 401));
  }

  // Parse the verified raw body into JSON
  try {
    req.body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return next(new AppError("Invalid JSON in webhook body", 400));
  }

  next();
};
