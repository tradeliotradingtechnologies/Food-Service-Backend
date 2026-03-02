import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as categoryService from "../services/categoryService.js";

export const createCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      status: "success",
      data: { category },
    });
  },
);

export const getAllCategories = catchAsync(
  async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === "true";
    const categories = await categoryService.getAllCategories(includeInactive);
    res.status(200).json({
      status: "success",
      results: categories.length,
      data: { categories },
    });
  },
);

export const getCategoryById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const category = await categoryService.getCategoryById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { category },
    });
  },
);

export const getCategoryBySlug = catchAsync(
  async (req: Request<{ slug: string }>, res: Response) => {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    res.status(200).json({
      status: "success",
      data: { category },
    });
  },
);

export const updateCategory = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: { category },
    });
  },
);

export const deleteCategory = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await categoryService.deleteCategory(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
