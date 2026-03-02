import { z } from "zod";

export const toggleLikeSchema = z.object({
  params: z.object({
    menuItemId: z.string().min(1, "Menu item ID is required"),
  }),
});
