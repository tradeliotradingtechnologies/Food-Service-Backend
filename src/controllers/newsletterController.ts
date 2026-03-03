import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as newsletterService from "../services/newsletterService.js";
import { sendNewsletterWelcomeEmail } from "../services/email/index.js";

export const subscribe = catchAsync(async (req: Request, res: Response) => {
  const subscriber = await newsletterService.subscribe(req.body.email);

  // Send newsletter welcome email (fire-and-forget)
  sendNewsletterWelcomeEmail(subscriber.email);

  res.status(201).json({
    status: "success",
    message: "Successfully subscribed to newsletter",
    data: { subscriber },
  });
});

export const unsubscribe = catchAsync(async (req: Request, res: Response) => {
  await newsletterService.unsubscribe(req.body.email);
  res.status(200).json({
    status: "success",
    message: "Successfully unsubscribed from newsletter",
  });
});

export const getAllSubscribers = catchAsync(
  async (req: Request, res: Response) => {
    const result = await newsletterService.getAllSubscribers(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

export const getSubscriberCount = catchAsync(
  async (_req: Request, res: Response) => {
    const count = await newsletterService.getSubscriberCount();
    res.status(200).json({
      status: "success",
      data: { count },
    });
  },
);
