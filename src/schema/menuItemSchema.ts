import { z } from "zod";

const nutritionalInfoSchema = z
  .object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
  })
  .optional();

export const createMenuItemSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(150),
    description: z.string().min(1, "Description is required").max(1000),
    price: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .pipe(z.number().min(0, "Price must be non-negative")),
    currency: z.string().length(3).optional(),
    category: z.string().min(1, "Category is required"),
    preparationTime: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
      .pipe(z.number().int().min(1, "Preparation time is required")),
    ingredients: z
      .union([z.array(z.string()), z.string()])
      .transform((val) => (typeof val === "string" ? JSON.parse(val) : val))
      .pipe(z.array(z.string()))
      .optional(),
    allergens: z
      .union([z.array(z.string()), z.string()])
      .transform((val) => (typeof val === "string" ? JSON.parse(val) : val))
      .pipe(z.array(z.string()))
      .optional(),
    nutritionalInfo: z
      .union([nutritionalInfoSchema, z.string()])
      .transform((val) => (typeof val === "string" ? JSON.parse(val) : val))
      .optional(),
    isAvailable: z
      .union([z.boolean(), z.string()])
      .transform((val) => (typeof val === "string" ? val === "true" : val))
      .optional(),
    isFeatured: z
      .union([z.boolean(), z.string()])
      .transform((val) => (typeof val === "string" ? val === "true" : val))
      .optional(),
  }),
});

export const updateMenuItemSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(1).max(150).optional(),
      description: z.string().min(1).max(1000).optional(),
      price: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
        .pipe(z.number().min(0))
        .optional(),
      currency: z.string().length(3).optional(),
      category: z.string().min(1).optional(),
      preparationTime: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
        .pipe(z.number().int().min(1))
        .optional(),
      ingredients: z
        .union([z.array(z.string()), z.string()])
        .transform((val) => (typeof val === "string" ? JSON.parse(val) : val))
        .pipe(z.array(z.string()))
        .optional(),
      allergens: z
        .union([z.array(z.string()), z.string()])
        .transform((val) => (typeof val === "string" ? JSON.parse(val) : val))
        .pipe(z.array(z.string()))
        .optional(),
      nutritionalInfo: z
        .union([nutritionalInfoSchema, z.string()])
        .transform((val) => (typeof val === "string" ? JSON.parse(val) : val))
        .optional(),
      isAvailable: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === "string" ? val === "true" : val))
        .optional(),
      isFeatured: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === "string" ? val === "true" : val))
        .optional(),
    })
    .default({}),
});

export const menuItemQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    isAvailable: z.coerce.boolean().optional(),
    isFeatured: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
  }),
});
