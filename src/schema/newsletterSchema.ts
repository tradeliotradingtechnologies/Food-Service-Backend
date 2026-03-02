import { z } from "zod";

export const subscribeSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Must be a valid email"),
  }),
});

export const unsubscribeSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Must be a valid email"),
  }),
});
