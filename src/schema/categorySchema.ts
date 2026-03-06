import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").min(2).max(100),
    description: z.string().max(500).optional(),
    isActive: z
      .union([z.boolean(), z.string()])
      .transform((val) => (typeof val === "string" ? val === "true" : val))
      .optional(),
    sortOrder: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
      .pipe(z.number().int().min(0))
      .optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
      isActive: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === "string" ? val === "true" : val))
        .optional(),
      sortOrder: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
        .pipe(z.number().int().min(0))
        .optional(),
    })
    .default({}),
});

export const paramIdSchema = z.object({
  params: z.object({ id: z.string().min(1, "ID is required") }),
});
