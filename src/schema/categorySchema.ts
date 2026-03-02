import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").min(2).max(100),
    description: z.string().max(500).optional(),
    image: z.string().url("Image must be a valid URL").optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    image: z.string().url("Image must be a valid URL").optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const paramIdSchema = z.object({
  params: z.object({ id: z.string().min(1, "ID is required") }),
});
