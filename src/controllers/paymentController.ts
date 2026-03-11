import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as paymentService from "../services/paymentService.js";
import * as paystackService from "../services/paystackService.js";

// ── Paystack: Initialize ────────────────────────────────────────

export const initializePaystackPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paystackService.initializeTransaction(
      req.user._id,
      req.body.orderId,
      req.user.email,
      req.body.callbackUrl,
    );
    res.status(200).json({
      status: "success",
      data: {
        payment: result.payment,
        authorizationUrl: result.authorizationUrl,
        accessCode: result.accessCode,
        reference: result.reference,
      },
    });
  },
);

// ── Paystack: Verify (callback / polling) ───────────────────────

export const verifyPaystackPayment = catchAsync(
  async (req: Request<{ reference: string }>, res: Response) => {
    const payment = await paystackService.verifyTransaction(
      req.params.reference,
    );
    res.status(200).json({
      status: "success",
      data: { payment },
    });
  },
);

// ── Paystack: Webhook ───────────────────────────────────────────

export const paystackWebhook = catchAsync(
  async (req: Request, res: Response) => {
    // Signature already verified by middleware
    await paystackService.handleWebhookEvent(req.body);

    // Paystack expects 200 quickly — do NOT send other status codes
    res.status(200).json({ status: "success" });
  },
);

// ── Generic: Initiate (non-Paystack) ────────────────────────────

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
    // Try Paystack refund first; falls back to generic refund for non-Paystack
    let payment;
    try {
      payment = await paystackService.initiateRefund(
        req.params.id,
        req.body.amount,
        req.body.reason,
      );
    } catch (err: any) {
      // If not a Paystack payment, use the generic refund
      if (err.message?.includes("only supported for Paystack")) {
        payment = await paymentService.refundPayment(
          req.params.id,
          req.body.amount,
        );
      } else {
        throw err;
      }
    }

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
