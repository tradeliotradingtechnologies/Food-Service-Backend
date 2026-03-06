// schemas/user.schema.ts
import { z } from "zod";
import { AUTH_METHODS } from "../types/model.types.js";

const dateSchema = (field: string) =>
  z.coerce
    .date()
    .refine(
      (value) => !Number.isNaN(value.getTime()),
      `${field} must be a valid date`,
    );

// ── Signup (local) ──────────────────────────────────────────────

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
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits")
    .optional(),
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

// ── Login (local) ───────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Email must be a valid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

// ── Google Auth ─────────────────────────────────────────────────

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "Google ID token is required"),
  }),
});

// ── Apple Auth ──────────────────────────────────────────────────

export const appleAuthSchema = z.object({
  body: z.object({
    identityToken: z.string().min(1, "Apple identity token is required"),
    user: z
      .object({
        name: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
          })
          .optional(),
        email: z.string().email().optional(),
      })
      .optional(),
  }),
});

// ── Update Profile ──────────────────────────────────────────────

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, "Name must be at least 2 characters").optional(),
      phoneNumber: z
        .string()
        .regex(/^\+?[0-9]{7,15}$/, "Phone number must contain 7 to 15 digits")
        .optional(),
    })
    .default({}),
});

// ── Update Password (authenticated) ────────────────────────────

const updatePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .min(8, "New password must be at least 8 characters"),
    newPasswordConfirm: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "Passwords do not match",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  });

export const updatePasswordSchema = z.object({
  body: updatePasswordBodySchema,
});

// Infer TypeScript types from schemas
export type SignupInput = z.infer<typeof signupSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>["body"];
export type AppleAuthInput = z.infer<typeof appleAuthSchema>["body"];

// ── Forgot Password ─────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Email must be a valid email address"),
  }),
});

// ── Reset Password ──────────────────────────────────────────────

const resetPasswordBodySchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    passwordConfirm: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  });

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Reset token is required"),
  }),
  body: resetPasswordBodySchema,
});

// ── Verify Email ────────────────────────────────────────────────

export const verifyEmailSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});
