import { z } from "zod";
import { RESERVATION_STATUSES } from "../types/model.types.js";

export const createReservationSchema = z.object({
  body: z.object({
    guestName: z.string().min(1, "Guest name is required").max(100),
    guestEmail: z.string().email("Invalid email").optional(),
    guestPhone: z.string().min(1, "Phone number is required"),
    date: z.string().min(1, "Date is required"), // ISO date string
    time: z.string().regex(/^\d{1,2}:\d{2}$/, "Time must be in HH:MM format"),
    partySize: z.number().int().min(1, "Party size must be at least 1"),
    specialRequests: z.string().max(500).optional(),
  }),
});

export const updateReservationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    guestName: z.string().min(1).max(100).optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().min(1).optional(),
    date: z.string().optional(),
    time: z
      .string()
      .regex(/^\d{1,2}:\d{2}$/)
      .optional(),
    partySize: z.number().int().min(1).optional(),
    tableNumber: z.number().int().min(1).optional(),
    specialRequests: z.string().max(500).optional(),
  }),
});

export const updateReservationStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(RESERVATION_STATUSES, {
      message: "Invalid reservation status",
    }),
    cancellationReason: z.string().max(500).optional(),
  }),
});

export const reservationQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    date: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  }),
});

export const cancelReservationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});
