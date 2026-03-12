import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS } from "../types/model.types.js";

export const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().optional(),
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

export const confirmAllOrdersSchema = z.object({
  body: z.object({
    note: z.string().max(300).optional(),
  }),
});

export const refreshOrderDeliveryAddressSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    addressId: z.string().optional(),
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

export const captureDeliveryCoordinatesSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
    accuracy: z.number().min(0).optional(),
  }),
});

export const updateDeliveryLocationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
    accuracy: z.number().min(0).optional(),
  }),
});

export const dispatchBoardQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
