import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as paymentService from "../services/paymentService.js";

export const initiatePayment = catchAsync(
  async (req: Request, res: Response) => {
    const payment = await paymentService.initiatePayment(
      req.user._id,
      req.body.orderId,
      req.body.method,
      req.body.provider,
    );
    res.status(201).json({
      status: "success",
      data: { payment },
    });
  },
);

export const confirmPayment = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const payment = await paymentService.confirmPayment(
      req.params.id,
      req.body.providerRef,
      req.body.metadata,
    );
    res.status(200).json({
      status: "success",
      data: { payment },
    });
  },
);

export const failPayment = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const payment = await paymentService.failPayment(req.params.id);
    res.status(200).json({
      status: "success",
      data: { payment },
    });
  },
);

export const refundPayment = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const payment = await paymentService.refundPayment(
      req.params.id,
      req.body.amount,
    );
    res.status(200).json({
      status: "success",
      data: { payment },
    });
  },
);

export const getPaymentByOrder = catchAsync(
  async (req: Request<{ orderId: string }>, res: Response) => {
    const payment = await paymentService.getPaymentByOrder(req.params.orderId);
    res.status(200).json({
      status: "success",
      data: { payment },
    });
  },
);

export const getUserPayments = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.getUserPayments(
      req.user._id,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);
