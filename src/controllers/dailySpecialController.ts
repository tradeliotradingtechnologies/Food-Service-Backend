import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as dailySpecialService from "../services/dailySpecialService.js";

export const createDailySpecial = catchAsync(
  async (req: Request, res: Response) => {
    const special = await dailySpecialService.createDailySpecial(
      req.body,
      req.user._id,
    );
    res.status(201).json({
      status: "success",
      data: { dailySpecial: special },
    });
  },
);

export const getTodaySpecials = catchAsync(
  async (_req: Request, res: Response) => {
    const specials = await dailySpecialService.getTodaySpecials();
    res.status(200).json({
      status: "success",
      results: specials.length,
      data: { dailySpecials: specials },
    });
  },
);

export const getDailySpecialsByDate = catchAsync(
  async (req: Request, res: Response) => {
    const date = new Date(req.query.date as string);
    const specials = await dailySpecialService.getDailySpecialsByDate(date);
    res.status(200).json({
      status: "success",
      results: specials.length,
      data: { dailySpecials: specials },
    });
  },
);

export const getDailySpecialById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const special = await dailySpecialService.getDailySpecialById(
      req.params.id,
    );
    res.status(200).json({
      status: "success",
      data: { dailySpecial: special },
    });
  },
);

export const updateDailySpecial = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const special = await dailySpecialService.updateDailySpecial(
      req.params.id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: { dailySpecial: special },
    });
  },
);

export const deleteDailySpecial = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await dailySpecialService.deleteDailySpecial(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
