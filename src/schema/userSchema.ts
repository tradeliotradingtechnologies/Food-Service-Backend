// schemas/user.schema.ts
import { z } from "zod";

const roleSchema = z.enum(["customer", "super_admin", "admin"], {
  error: "Role must be one of: customer, super_admin, admin",
});

const roleArraySchema = z
  .array(roleSchema)
  .min(1, "At least one role is required");

const dateSchema = (field: string) =>
  z.coerce
    .date()
    .refine(
      (value) => !Number.isNaN(value.getTime()),
      `${field} must be a valid date`,
    );

const signupBodyBaseSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Email must be a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  passwordConfirm: z
    .string()
    .min(1, "Password confirmation is required")
    .min(8, "Password confirmation must be at least 8 characters"),
  role: roleArraySchema.optional(),
  location: z.string().min(1, "Location is required").optional(),
  landMark: z.string().min(1, "Landmark is required").optional(),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits")
    .optional(),
  active: z.boolean().optional(),
  passwordResetToken: z
    .string()
    .min(1, "Password reset token is required")
    .optional(),
  passwordResetExpires: dateSchema("Password reset expiry").optional(),
  passwordChangedAt: dateSchema("Password changed at").optional(),
  createdAt: dateSchema("Created at").optional(),
  updatedAt: dateSchema("Updated at").optional(),
});

const signupBodySchema = signupBodyBaseSchema.refine(
  (data) => data.password === data.passwordConfirm,
  {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  },
);

export const signupSchema = z.object({
  body: signupBodySchema,
});

export const loginSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID is required"),
  }),
  body: signupBodyBaseSchema.partial(),
});

// Infer TypeScript types from schemas
export type signupInput = z.infer<typeof signupSchema>["body"];
export type loginInput = z.infer<typeof loginSchema>["body"];
