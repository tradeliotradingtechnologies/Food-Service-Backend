import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as menuItemLikeService from "../services/menuItemLikeService.js";

export const toggleLike = catchAsync(
  async (req: Request<{ menuItemId: string }>, res: Response) => {
    const result = await menuItemLikeService.toggleLike(
      req.user._id,
      req.params.menuItemId,
    );
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

export const getUserLikes = catchAsync(async (req: Request, res: Response) => {
  const likes = await menuItemLikeService.getUserLikes(req.user._id);
  res.status(200).json({
    status: "success",
    results: likes.length,
    data: { likes },
  });
});

export const checkLikeStatus = catchAsync(
  async (req: Request<{ menuItemId: string }>, res: Response) => {
    const result = await menuItemLikeService.checkLikeStatus(
      req.user._id,
      req.params.menuItemId,
    );
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);
