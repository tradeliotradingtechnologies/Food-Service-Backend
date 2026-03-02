import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as cartService from "../services/cartService.js";

export const getCart = catchAsync(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user._id);
  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

export const addToCart = catchAsync(async (req: Request, res: Response) => {
  const cart = await cartService.addToCart(
    req.user._id,
    req.body.menuItem,
    req.body.quantity,
  );
  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

export const updateCartItem = catchAsync(
  async (req: Request<{ menuItemId: string }>, res: Response) => {
    const cart = await cartService.updateCartItem(
      req.user._id,
      req.params.menuItemId,
      req.body.quantity,
    );
    res.status(200).json({
      status: "success",
      data: { cart },
    });
  },
);

export const removeFromCart = catchAsync(
  async (req: Request<{ menuItemId: string }>, res: Response) => {
    const cart = await cartService.removeFromCart(
      req.user._id,
      req.params.menuItemId,
    );
    res.status(200).json({
      status: "success",
      data: { cart },
    });
  },
);

export const clearCart = catchAsync(async (req: Request, res: Response) => {
  const cart = await cartService.clearCart(req.user._id);
  res.status(200).json({
    status: "success",
    data: { cart },
  });
});
