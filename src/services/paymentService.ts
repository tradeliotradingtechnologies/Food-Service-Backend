import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import { getPaymentSettings } from "./appSettingsService.js";
import AppError from "../utils/appError.js";
import type { PaymentMethod } from "../types/model.types.js";

export const initiatePayment = async (
  userId: string,
  cartSnapshot: Record<string, any>,
  method: PaymentMethod,
  provider?: string,
) => {
  const paymentSettings = await getPaymentSettings();

  if (!paymentSettings.enabledMethods.includes(method)) {
    throw new AppError(
      `Payment method '${method}' is currently unavailable.`,
      400,
    );
  }

  // Calculate total amount from cartSnapshot
  const amount = cartSnapshot.totalAmount;
  if (!amount || amount <= 0) {
    throw new AppError("Invalid cart total amount for payment", 400);
  }

  // Optionally, prevent duplicate pending payments for the same cart/user
  const existing = await Payment.findOne({
    user: userId,
    status: { $in: ["initiated", "pending"] },
  });
  if (existing) {
    existing.method = method;
    existing.provider = provider;
    existing.status = "initiated";
    existing.amount = amount;
    existing.cartSnapshot = cartSnapshot;
    await existing.save();
    return existing;
  }

  return Payment.create({
    user: userId,
    amount,
    currency: paymentSettings.currency,
    method,
    provider,
    status: "initiated",
    cartSnapshot,
  });
};

export const confirmPayment = async (
  paymentId: string,
  providerRef: string,
  metadata?: Record<string, unknown>,
) => {
  const paymentSettings = await getPaymentSettings();
  if (!paymentSettings.allowManualConfirmation) {
    throw new AppError(
      "Manual payment confirmation is currently disabled",
      403,
    );
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found", 404);

  if (payment.status === "success") {
    throw new AppError("Payment is already confirmed", 400);
  }

  payment.status = "success";
  payment.providerRef = providerRef;
  payment.paidAt = new Date();
  if (metadata) payment.metadata = metadata;
  await payment.save();

  // If order does not exist, create it from cartSnapshot
  let order = null;
  if (!payment.order && payment.cartSnapshot) {
    const orderService = await import("./orderService.js");
    // cartSnapshot should contain all necessary order fields
    order = await orderService.createOrderFromPaymentSnapshot(
      payment.user,
      payment.cartSnapshot,
    );
    payment.order = order._id;
    await payment.save();
  } else if (payment.order) {
    order = await Order.findById(payment.order);
  }

  // Update order payment status if order exists
  if (order) {
    order.paymentStatus = "success";
    await order.save();
    // Clear the user's cart
    const Cart = (await import("../models/cartModel.js")).default;
    const cart = await Cart.findOne({ user: order.user });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
  }

  return payment;
};

export const failPayment = async (paymentId: string) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found", 404);

  payment.status = "failed";
  await payment.save();

  await Order.findByIdAndUpdate(payment.order, { paymentStatus: "failed" });

  return payment;
};

export const refundPayment = async (paymentId: string, amount?: number) => {
  const paymentSettings = await getPaymentSettings();
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found", 404);

  if (payment.status !== "success") {
    throw new AppError("Only successful payments can be refunded", 400);
  }

  if (
    paymentSettings.refundWindowDays > 0 &&
    payment.paidAt &&
    Date.now() - payment.paidAt.getTime() >
      paymentSettings.refundWindowDays * 24 * 60 * 60 * 1000
  ) {
    throw new AppError("Refund window for this payment has expired", 400);
  }

  const refundAmount = amount || payment.amount;
  if (refundAmount > payment.amount) {
    throw new AppError("Refund amount exceeds payment amount", 400);
  }

  payment.status = "refunded";
  payment.refundedAt = new Date();
  payment.refundAmount = refundAmount;
  await payment.save();

  await Order.findByIdAndUpdate(payment.order, { paymentStatus: "refunded" });

  return payment;
};

export const getPaymentByOrder = async (orderId: string) => {
  const payment = await Payment.findOne({ order: orderId });
  if (!payment) throw new AppError("Payment not found", 404);
  return payment;
};

export const getUserPayments = async (
  userId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find({ user: userId })
      .populate("order", "orderNumber totalAmount status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments({ user: userId }),
  ]);

  return {
    payments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};
