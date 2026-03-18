import { z } from "zod";

export const createExtraItemsCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required").max(100),
  }),
});

export const updateExtraItemsCategorySchema = z.object({
  params: z.object({ id: z.string().min(1, "ID is required") }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
    })
    .default({}),
});

export const extraItemsCategoryParamIdSchema = z.object({
  params: z.object({ id: z.string().min(1, "ID is required") }),
});
