import { z } from "zod";

export const createTestimonialSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required").max(500),
    rating: z.number().int().min(1).max(5),
    menuItem: z.string().optional(),
  }),
});

export const updateTestimonialSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    content: z.string().min(1).max(500).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  }),
});

export const moderateTestimonialSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    isApproved: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
});
