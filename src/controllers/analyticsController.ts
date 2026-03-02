import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as analyticsService from "../services/analyticsService.js";

// ── Dashboard Overview ──────────────────────────────────────────

export const getDashboardOverview = catchAsync(
  async (_req: Request, res: Response) => {
    const data = await analyticsService.getDashboardOverview();
    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// ── Revenue Chart ───────────────────────────────────────────────

export const getRevenueChart = catchAsync(
  async (req: Request, res: Response) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const data = await analyticsService.getRevenueChart(year, month);
    res.status(200).json({
      status: "success",
      data: { chart: data },
    });
  },
);

// ── Sales Analytics ─────────────────────────────────────────────

export const getSalesAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const period = (req.query.period as string) || "month";
    const data = await analyticsService.getSalesAnalytics(
      period as "today" | "week" | "month" | "year",
    );
    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// ── Order Analytics ─────────────────────────────────────────────

export const getOrderAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const period = (req.query.period as string) || "month";
    const data = await analyticsService.getOrderAnalytics(
      period as "today" | "week" | "month" | "year",
    );
    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// ── Customer Analytics ──────────────────────────────────────────

export const getCustomerAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const period = (req.query.period as string) || "month";
    const data = await analyticsService.getCustomerAnalytics(
      period as "week" | "month" | "year",
    );
    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// ── Menu Performance ────────────────────────────────────────────

export const getMenuPerformance = catchAsync(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 20;
    const period = (req.query.period as string) || "month";
    const data = await analyticsService.getMenuPerformance(
      limit,
      period as "week" | "month" | "year",
    );
    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// ── Recent Activity ─────────────────────────────────────────────

export const getRecentActivity = catchAsync(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 20;
    const data = await analyticsService.getRecentActivity(limit);
    res.status(200).json({
      status: "success",
      results: data.length,
      data: { activities: data },
    });
  },
);

// ── Reservation Analytics ───────────────────────────────────────

export const getReservationAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const period = (req.query.period as string) || "month";
    const data = await analyticsService.getReservationAnalytics(
      period as "today" | "week" | "month",
    );
    res.status(200).json({
      status: "success",
      data,
    });
  },
);
