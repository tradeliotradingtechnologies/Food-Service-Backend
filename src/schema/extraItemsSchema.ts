import { z } from "zod";

export const createExtraItemSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required").max(120),
    price: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .pipe(z.number().min(0, "Price must be non-negative")),
    description: z.string().max(300).optional(),
    category: z.string().min(1, "Category is required"),
  }),
});

export const updateExtraItemSchema = z.object({
  params: z.object({ id: z.string().min(1, "ID is required") }),
  body: z
    .object({
      name: z.string().min(2).max(120).optional(),
      price: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
        .pipe(z.number().min(0, "Price must be non-negative"))
        .optional(),
      description: z.string().max(300).optional(),
      category: z.string().min(1).optional(),
    })
    .default({}),
});

export const extraItemQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
  }),
});

export const extraItemParamIdSchema = z.object({
  params: z.object({ id: z.string().min(1, "ID is required") }),
});
