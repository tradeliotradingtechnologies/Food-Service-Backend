import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as menuItemService from "../services/menuItemService.js";

export const createMenuItem = catchAsync(
  async (req: Request, res: Response) => {
    const item = await menuItemService.createMenuItem(req.body, req.user._id);
    res.status(201).json({
      status: "success",
      data: { menuItem: item },
    });
  },
);

export const getMenuItems = catchAsync(async (req: Request, res: Response) => {
  const query = {
    category: req.query.category as string | undefined,
    search: req.query.search as string | undefined,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    isAvailable:
      req.query.isAvailable !== undefined
        ? req.query.isAvailable === "true"
        : undefined,
    isFeatured:
      req.query.isFeatured !== undefined
        ? req.query.isFeatured === "true"
        : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    sort: req.query.sort as string | undefined,
  };

  const result = await menuItemService.getMenuItems(query);
  res.status(200).json({
    status: "success",
    results: result.items.length,
    data: result,
  });
});

export const getMenuItemById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const item = await menuItemService.getMenuItemById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { menuItem: item },
    });
  },
);

export const getMenuItemBySlug = catchAsync(
  async (req: Request<{ slug: string }>, res: Response) => {
    const item = await menuItemService.getMenuItemBySlug(req.params.slug);
    res.status(200).json({
      status: "success",
      data: { menuItem: item },
    });
  },
);

export const updateMenuItem = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const item = await menuItemService.updateMenuItem(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      data: { menuItem: item },
    });
  },
);

export const deleteMenuItem = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await menuItemService.deleteMenuItem(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
