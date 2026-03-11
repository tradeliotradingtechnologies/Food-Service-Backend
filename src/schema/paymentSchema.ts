import { z } from "zod";
import { PAYMENT_METHODS } from "../types/model.types.js";

export const initiatePaymentSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, "Order ID is required"),
    method: z.enum(PAYMENT_METHODS, { message: "Invalid payment method" }),
    provider: z.string().optional(),
  }),
});

export const initiatePaystackSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, "Order ID is required"),
    callbackUrl: z.string().url("Invalid callback URL").optional(),
  }),
});

export const verifyPaystackSchema = z.object({
  params: z.object({
    reference: z.string().min(1, "Reference is required"),
  }),
});

export const confirmPaymentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    providerRef: z.string().min(1, "Provider reference is required"),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const refundPaymentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    amount: z.number().min(0.01, "Refund amount must be positive").optional(),
    reason: z.string().max(500).optional(),
  }),
});
