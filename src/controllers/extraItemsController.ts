import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as extraItemsService from "../services/extraItemsService.js";

export const createExtraItem = catchAsync(
  async (req: Request, res: Response) => {
    const extraItem = await extraItemsService.createExtraItem(req.body);

    res.status(201).json({
      status: "success",
      data: { extraItem },
    });
  },
);

export const getExtraItems = catchAsync(async (req: Request, res: Response) => {
  const items = await extraItemsService.getExtraItems({
    category: req.query.category as string | undefined,
  });

  res.status(200).json({
    status: "success",
    results: items.length,
    data: { items },
  });
});

export const getExtraItemById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const extraItem = await extraItemsService.getExtraItemById(req.params.id);

    res.status(200).json({
      status: "success",
      data: { extraItem },
    });
  },
);

export const updateExtraItem = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const extraItem = await extraItemsService.updateExtraItem(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      status: "success",
      data: { extraItem },
    });
  },
);

export const deleteExtraItem = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await extraItemsService.deleteExtraItem(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
