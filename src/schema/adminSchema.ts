import { z } from "zod";
import { ROLE_NAMES } from "../types/model.types.js";

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
