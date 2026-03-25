import { z } from "zod";
import { PAYMENT_METHODS } from "../types/model.types.js";

const timePattern = /^\d{1,2}:\d{2}$/;

const processingFeeSchema = z.object({
  type: z.enum(["fixed", "percentage"], {
    message: "type must be 'fixed' or 'percentage'",
  }),
  amount: z
    .number({ message: "amount must be a number" })
    .min(0, "amount must be >= 0"),
});

export const adminUpdateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[0-9]{7,15}$/)
      .optional(),
    role: z.string().min(1).optional(),
    active: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
  }),
});

export const userQuerySchema = z.object({
  query: z.object({
    role: z.string().optional(),
    active: z.coerce.boolean().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateProcessingFeeSchema = z.object({
  body: processingFeeSchema,
});

export const settingsKeySchema = z.object({
  params: z.object({
    key: z.enum(["orders", "reservations", "payments", "commission"]),
  }),
});

const promoCodeShape = z.object({
  code: z
    .string()
    .min(3, "Promo code must be at least 3 characters")
    .max(32, "Promo code cannot exceed 32 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Promo code can only include letters, numbers, _ and -",
    ),
  description: z.string().max(300).optional(),
  expiresAt: z.coerce.date(),
  isActive: z.boolean().optional(),
});

export const createPromoCodeSchema = z.object({
  body: promoCodeShape,
});

export const updatePromoCodeSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: promoCodeShape
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one promo code field must be provided",
    }),
});

export const promoCodeIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const promoCodeQuerySchema = z.object({
  query: z.object({
    isActive: z.coerce.boolean().optional(),
    includeExpired: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateCommissionSettingsSchema = z.object({
  body: z
    .object({
      enabled: z.boolean().optional(),
      percentage: z.number().min(0).max(100).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one commission setting must be provided",
    }),
});

export const updateOrderSettingsSchema = z.object({
  body: z
    .object({
      orderingEnabled: z.boolean().optional(),
      processingFee: processingFeeSchema.optional(),
      taxRate: z.number().min(0).max(100).optional(),
      deliveryFee: z.number().min(0).optional(),
      freeDeliveryThreshold: z.number().min(0).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one order setting must be provided",
    }),
});

export const updateReservationSettingsSchema = z.object({
  body: z
    .object({
      reservationsEnabled: z.boolean().optional(),
      minPartySize: z.number().int().min(1).optional(),
      maxPartySize: z.number().int().min(1).optional(),
      minAdvanceHours: z.number().int().min(0).optional(),
      maxAdvanceDays: z.number().int().min(1).optional(),
      openingTime: z.string().regex(timePattern).optional(),
      closingTime: z.string().regex(timePattern).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one reservation setting must be provided",
    }),
});

export const updatePaymentSettingsSchema = z.object({
  body: z
    .object({
      currency: z.string().min(3).max(3).optional(),
      enabledMethods: z.array(z.enum(PAYMENT_METHODS)).min(1).optional(),
      paystackEnabled: z.boolean().optional(),
      allowManualConfirmation: z.boolean().optional(),
      refundWindowDays: z.number().int().min(0).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one payment setting must be provided",
    }),
});
