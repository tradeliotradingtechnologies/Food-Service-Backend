import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as orderService from "../services/orderService.js";

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.user._id, req.body);
  res.status(201).json({
    status: "success",
    data: { order },
  });
});

export const getUserOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.getUserOrders(req.user._id, {
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.status(200).json({
    status: "success",
    results: result.orders.length,
    data: result,
  });
});

export const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.getAllOrders({
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.status(200).json({
    status: "success",
    results: result.orders.length,
    data: result,
  });
});

export const getOrderById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    // If user is admin/staff, don't filter by userId
    const role = req.user.role as any;
    const isAdmin = ["super_admin", "admin", "staff"].includes(role?.name);
    const userId = isAdmin ? undefined : req.user._id;

    const order = await orderService.getOrderById(req.params.id, userId);
    res.status(200).json({
      status: "success",
      data: { order },
    });
  },
);

export const updateOrderStatus = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
      req.user._id,
      req.body.note,
    );
    res.status(200).json({
      status: "success",
      data: { order },
    });
  },
);

export const assignRider = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const order = await orderService.assignRider(
      req.params.id,
      req.body.riderId,
    );
    res.status(200).json({
      status: "success",
      data: { order },
    });
  },
);

export const cancelOrder = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const role = req.user.role as any;
    const isAdmin = ["super_admin", "admin"].includes(role?.name);

    const order = await orderService.cancelOrder(
      req.params.id,
      req.user._id,
      req.body.reason,
      isAdmin,
    );
    res.status(200).json({
      status: "success",
      data: { order },
    });
  },
);
