import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as menuItemService from "../services/menuItemService.js";
import { processAndUploadMany } from "../services/imageService.js";

export const createMenuItem = catchAsync(
  async (req: Request, res: Response) => {
    const data = { ...req.body };

    // Handle image file uploads
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const results = await processAndUploadMany(
        files.map((f) => f.buffer),
        { preset: "menuItem", folder: "ericas-kitchen/menu-items" },
      );
      data.images = results.map((r) => r.url);
    }

    if (!data.images || data.images.length === 0) {
      throw new AppError("At least one image is required", 400);
    }

    const item = await menuItemService.createMenuItem(data, req.user._id);
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
    const data = { ...req.body };

    // Handle image file uploads
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const results = await processAndUploadMany(
        files.map((f) => f.buffer),
        { preset: "menuItem", folder: "ericas-kitchen/menu-items" },
      );
      data.images = results.map((r) => r.url);
    }

    const item = await menuItemService.updateMenuItem(req.params.id, data);
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
