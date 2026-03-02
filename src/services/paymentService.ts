import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import AppError from "../utils/appError.js";
import type { PaymentMethod } from "../types/model.types.js";

export const initiatePayment = async (
  userId: string,
  orderId: string,
  method: PaymentMethod,
  provider?: string,
) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new AppError("Order not found", 404);

  // Check if payment already exists for this order
  const existing = await Payment.findOne({ order: orderId });
  if (existing && existing.status === "success") {
    throw new AppError("Order is already paid", 400);
  }

  if (existing) {
    // Update existing initiated/failed payment
    existing.method = method;
    existing.provider = provider;
    existing.status = "initiated";
    await existing.save();
    return existing;
  }

  return Payment.create({
    order: orderId,
    user: userId,
    amount: order.totalAmount,
    currency: "GHS",
    method,
    provider,
    status: "initiated",
  });
};

export const confirmPayment = async (
  paymentId: string,
  providerRef: string,
  metadata?: Record<string, unknown>,
) => {
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

  // Update order payment status
  await Order.findByIdAndUpdate(payment.order, { paymentStatus: "paid" });

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
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found", 404);

  if (payment.status !== "success") {
    throw new AppError("Only successful payments can be refunded", 400);
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
