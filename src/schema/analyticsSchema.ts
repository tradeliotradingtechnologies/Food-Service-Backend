import { z } from "zod";

const periodEnum = z.enum(["today", "week", "month", "year"]).optional();

export const dashboardQuerySchema = z.object({
  query: z.object({}).optional(),
});

export const salesQuerySchema = z.object({
  query: z.object({
    period: periodEnum,
  }),
});

export const orderAnalyticsQuerySchema = z.object({
  query: z.object({
    period: periodEnum,
  }),
});

export const customerAnalyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(["week", "month", "year"]).optional(),
  }),
});

export const menuPerformanceQuerySchema = z.object({
  query: z.object({
    period: z.enum(["week", "month", "year"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  }),
});

export const revenueChartQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2020).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  }),
});

export const reservationAnalyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(["today", "week", "month"]).optional(),
  }),
});
