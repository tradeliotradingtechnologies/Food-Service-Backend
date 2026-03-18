import { Request, Response } from "express";import { Request, Response } from "express";




























































);  },    });      data: null,      status: "success",    res.status(204).json({    await extraItemsService.deleteExtraItem(req.params.id);  async (req: Request<{ id: string }>, res: Response) => {export const deleteExtraItem = catchAsync();  },    });      data: { extraItem },      status: "success",    res.status(200).json({    );      req.body,      req.params.id,    const extraItem = await extraItemsService.updateExtraItem(  async (req: Request<{ id: string }>, res: Response) => {export const updateExtraItem = catchAsync();  },    });      data: { extraItem },      status: "success",    res.status(200).json({    const extraItem = await extraItemsService.getExtraItemById(req.params.id);  async (req: Request<{ id: string }>, res: Response) => {export const getExtraItemById = catchAsync(});  });    data: { items },    results: items.length,    status: "success",  res.status(200).json({  });    category: req.query.category as string | undefined,  const items = await extraItemsService.getExtraItems({export const getExtraItems = catchAsync(async (req: Request, res: Response) => {});  });    data: { extraItem },    status: "success",  res.status(201).json({  const extraItem = await extraItemsService.createExtraItem(req.body);export const createExtraItem = catchAsync(async (req: Request, res: Response) => {import * as extraItemsService from "../services/extraItemsService.js";import catchAsync from "../utils/catchAsync.js";import catchAsync from "../utils/catchAsync.js";
import * as extraItemsService from "../services/extraItemsService.js";

export const createExtraItem = catchAsync(async (req: Request, res: Response) => {
  const extraItem = await extraItemsService.createExtraItem(req.body);

  res.status(201).json({
    status: "success",
    data: { extraItem },
  });
});

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
