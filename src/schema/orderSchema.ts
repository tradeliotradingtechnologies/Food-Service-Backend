import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS } from "../types/model.types.js";

export const createOrderSchema = z.object({
  body: z.object({
    deliveryAddress: z.object({
      location: z.string().min(1, "Location is required"),
      landmark: z.string().optional(),
      gpsAddress: z.string().optional(),
      phoneNumber: z
        .string()
        .regex(/^\+?[0-9]{7,15}$/, "Valid phone number is required"),
    }),
    paymentMethod: z.enum(PAYMENT_METHODS, {
      message: "Invalid payment method",
    }),
    notes: z.string().max(500).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(ORDER_STATUSES, { message: "Invalid order status" }),
    note: z.string().max(300).optional(),
  }),
});

export const assignRiderSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    riderId: z.string().min(1, "Rider ID is required"),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(1, "Cancellation reason is required").max(500),
  }),
});

export const orderQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
