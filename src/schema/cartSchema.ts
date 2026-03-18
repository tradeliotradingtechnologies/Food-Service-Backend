import { z } from "zod";

const selectedExtraSchema = z.object({
  extraItem: z.string().min(1, "Extra item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
});

export const addToCartSchema = z.object({
  body: z.object({
    menuItem: z.string().min(1, "Menu item ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
    selectedExtras: z.array(selectedExtraSchema).optional().default([]),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({ itemId: z.string().min(1) }),
  body: z.object({
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    selectedExtras: z.array(selectedExtraSchema).optional(),
  }),
});

export const removeCartItemSchema = z.object({
  params: z.object({ itemId: z.string().min(1) }),
});
