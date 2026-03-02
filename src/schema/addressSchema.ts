import { z } from "zod";

export const createAddressSchema = z.object({
  body: z.object({
    label: z.string().max(50).optional(),
    location: z.string().min(1, "Location is required").max(300),
    landmark: z.string().max(200).optional(),
    gpsAddress: z
      .string()
      .regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, "Invalid Ghana Post GPS format")
      .optional(),
    coordinates: z
      .object({
        type: z.literal("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
      })
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits"),
    isDefault: z.boolean().optional(),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    label: z.string().max(50).optional(),
    location: z.string().min(1).max(300).optional(),
    landmark: z.string().max(200).optional(),
    gpsAddress: z
      .string()
      .regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, "Invalid Ghana Post GPS format")
      .optional(),
    coordinates: z
      .object({
        type: z.literal("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
      })
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits")
      .optional(),
    isDefault: z.boolean().optional(),
  }),
});
