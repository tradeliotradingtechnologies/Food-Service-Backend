import { z } from "zod/v4";

// ── Upload params schema (query-string driven) ──────────────────
export const uploadParamsSchema = z.object({
  query: z.object({
    preset: z
      .enum(["menuItem", "category", "avatar", "thumbnail"])
      .optional()
      .default("menuItem"),
    folder: z.string().min(1).max(100).optional(),
  }),
});

// ── Delete image schema ─────────────────────────────────────────
export const deleteImageSchema = z.object({
  params: z.object({
    publicId: z.string().min(1, "publicId is required"),
  }),
});
