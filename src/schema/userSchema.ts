// schemas/user.schema.ts
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

const userBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  passwordConfirm: z.string().min(8, "Password must be at least 8 characters"),
  role: objectIdSchema,
  location: z.string(),
  landMark: z.string(),
  phoneNumber: z.string(),
  active: z.boolean(),
  passwordResetToken: z.string(),
  passwordResetExpires: z.coerce.date(),
  passwordChangedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const signupSchema = z.object({
  body: userBodySchema,
});

export const loginSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID is required"),
  }),
  body: userBodySchema.partial(),
});

// Infer TypeScript types from schemas
export type signupInput = z.infer<typeof signupSchema>["body"];
export type loginInput = z.infer<typeof loginSchema>["body"];
