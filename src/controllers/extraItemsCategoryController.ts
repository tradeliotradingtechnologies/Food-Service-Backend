import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as extraItemsCategoryService from "../services/extraItemsCategoryService.js";

export const createExtraItemsCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await extraItemsCategoryService.createExtraItemsCategory(
      req.body,
    );

    res.status(201).json({
      status: "success",
      data: { category },
    });
  },
);

export const getAllExtraItemsCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const categories =
      await extraItemsCategoryService.getAllExtraItemsCategories();

    res.status(200).json({
      status: "success",
      results: categories.length,
      data: { categories },
    });
  },
);

export const getExtraItemsCategoryById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const category = await extraItemsCategoryService.getExtraItemsCategoryById(
      req.params.id,
    );

    res.status(200).json({
      status: "success",
      data: { category },
    });
  },
);

export const updateExtraItemsCategory = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const category = await extraItemsCategoryService.updateExtraItemsCategory(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      status: "success",
      data: { category },
    });
  },
);

export const deleteExtraItemsCategory = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await extraItemsCategoryService.deleteExtraItemsCategory(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
