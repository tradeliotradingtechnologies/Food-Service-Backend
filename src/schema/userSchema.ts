// schemas/user.schema.ts
import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirm: z.string().min(8, "Password must be at least 8 characters"),
    age: z.number().min(18, "Must be at least 18").optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID is required"),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.email().optional(),
  }),
});

// Infer TypeScript types from schemas
export type signupInput = z.infer<typeof signupSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
