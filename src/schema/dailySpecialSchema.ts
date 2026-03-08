import { z } from "zod";

export const createDailySpecialSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().min(1, "Description is required").max(1000),
    menuItem: z.string().min(1, "Menu item is required"),
    date: z.coerce.date({ message: "Valid date is required" }).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const updateDailySpecialSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(1000).optional(),
    menuItem: z.string().min(1).optional(),
    date: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});
