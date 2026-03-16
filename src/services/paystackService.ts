import { createHmac } from "node:crypto";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import { getPaymentSettings } from "./appSettingsService.js";
import AppError from "../utils/appError.js";

// ────────────────────────────────────────────────────────────────
//  Paystack REST helpers
// ────────────────────────────────────────────────────────────────

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new AppError("Paystack secret key is not configured", 500);
  return key;
}

async function paystackRequest<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = (await res.json()) as any;

  if (!res.ok || json.status === false) {
    throw new AppError(
      json.message || "Paystack request failed",
      res.status >= 500 ? 502 : 400,
    );
  }

  return json as T;
}

// ────────────────────────────────────────────────────────────────
//  Initialize Transaction
//  Creates a payment record and requests a Paystack checkout URL.
// ────────────────────────────────────────────────────────────────

interface InitializeResult {
  payment: InstanceType<typeof Payment>;
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export const initializeTransaction = async (
  userId: string,
  orderId: string,
  email: string,
  callbackUrl?: string,
): Promise<InitializeResult> => {
  const paymentSettings = await getPaymentSettings();

  if (!paymentSettings.paystackEnabled) {
    throw new AppError("Paystack payments are currently unavailable", 503);
  }

  if (!paymentSettings.enabledMethods.includes("card")) {
    throw new AppError("Card payments are currently unavailable", 400);
  }

  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new AppError("Order not found", 404);

  // Prevent double-payment
  const existing = await Payment.findOne({ order: orderId });
  if (existing?.status === "success") {
    throw new AppError("Order is already paid", 400);
  }

  // Paystack expects amount in the smallest currency unit (pesewas for GHS)
  const amountInPesewas = Math.round(order.totalAmount * 100);

  const paystackRes = await paystackRequest<{
    status: boolean;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }>("POST", "/transaction/initialize", {
    email,
    amount: amountInPesewas,
    currency: paymentSettings.currency,
    reference: `EK-${orderId}-${Date.now()}`,
    callback_url: callbackUrl || process.env.PAYSTACK_CALLBACK_URL,
    metadata: {
      orderId,
      userId,
      orderNumber: order.orderNumber,
    },
  });

  // Upsert the local payment record
  let payment: InstanceType<typeof Payment>;

  if (existing) {
    existing.method = "card"; // Paystack supports card + mobile money
    existing.provider = "paystack";
    existing.providerRef = paystackRes.data.reference;
    existing.status = "pending";
    existing.metadata = {
      accessCode: paystackRes.data.access_code,
      paystackReference: paystackRes.data.reference,
    };
    await existing.save();
    payment = existing;
  } else {
    payment = await Payment.create({
      order: orderId,
      user: userId,
      amount: order.totalAmount,
      currency: paymentSettings.currency,
      method: "card",
      provider: "paystack",
      providerRef: paystackRes.data.reference,
      status: "pending",
      metadata: {
        accessCode: paystackRes.data.access_code,
        paystackReference: paystackRes.data.reference,
      },
    });
  }

  return {
    payment,
    authorizationUrl: paystackRes.data.authorization_url,
    accessCode: paystackRes.data.access_code,
    reference: paystackRes.data.reference,
  };
};

// ────────────────────────────────────────────────────────────────
//  Verify Transaction
//  Called after redirect or as a fallback check.
// ────────────────────────────────────────────────────────────────

export const verifyTransaction = async (reference: string) => {
  const paystackRes = await paystackRequest<{
    data: {
      status: string;
      reference: string;
      amount: number;
      currency: string;
      channel: string;
      paid_at: string;
      metadata: Record<string, unknown>;
      gateway_response: string;
    };
  }>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);

  const { data } = paystackRes;

  const payment = await Payment.findOne({ providerRef: reference });
  if (!payment) throw new AppError("Payment record not found", 404);

  if (payment.status === "success") {
    return payment; // already processed (idempotent)
  }

  if (data.status === "success") {
    payment.status = "success";
    payment.paidAt = new Date(data.paid_at);
    payment.metadata = {
      ...((payment.metadata as Record<string, unknown>) || {}),
      channel: data.channel,
      gatewayResponse: data.gateway_response,
    };
    await payment.save();

    await Order.findByIdAndUpdate(payment.order, { paymentStatus: "success" });
  } else {
    payment.status = "failed";
    payment.metadata = {
      ...((payment.metadata as Record<string, unknown>) || {}),
      gatewayResponse: data.gateway_response,
    };
    await payment.save();

    await Order.findByIdAndUpdate(payment.order, { paymentStatus: "failed" });
  }

  return payment;
};

// ────────────────────────────────────────────────────────────────
//  Webhook handler
//  Processes Paystack's server-to-server event notifications.
//  Signature is verified BEFORE this function is called (middleware).
// ────────────────────────────────────────────────────────────────

export const handleWebhookEvent = async (event: Record<string, any>) => {
  const { event: eventType, data } = event;

  switch (eventType) {
    case "charge.success": {
      const reference = data.reference as string;
      const payment = await Payment.findOne({ providerRef: reference });
      if (!payment || payment.status === "success") return; // already handled

      payment.status = "success";
      payment.paidAt = new Date(data.paid_at);
      payment.metadata = {
        ...((payment.metadata as Record<string, unknown>) || {}),
        channel: data.channel,
        gatewayResponse: data.gateway_response,
        webhookProcessed: true,
      };
      await payment.save();

      await Order.findByIdAndUpdate(payment.order, { paymentStatus: "success" });
      break;
    }

    case "charge.failed": {
      const reference = data.reference as string;
      const payment = await Payment.findOne({ providerRef: reference });
      if (!payment || payment.status === "success") return;

      payment.status = "failed";
      payment.metadata = {
        ...((payment.metadata as Record<string, unknown>) || {}),
        gatewayResponse: data.gateway_response,
        webhookProcessed: true,
      };
      await payment.save();

      await Order.findByIdAndUpdate(payment.order, { paymentStatus: "failed" });
      break;
    }

    case "refund.processed": {
      const reference = data.transaction_reference as string;
      const payment = await Payment.findOne({ providerRef: reference });
      if (!payment) return;

      payment.status = "refunded";
      payment.refundedAt = new Date();
      payment.refundAmount = (data.amount as number) / 100; // pesewas → GHS
      payment.metadata = {
        ...((payment.metadata as Record<string, unknown>) || {}),
        refundReference: data.id,
        webhookProcessed: true,
      };
      await payment.save();

      await Order.findByIdAndUpdate(payment.order, {
        paymentStatus: "refunded",
      });
      break;
    }

    default:
      // Ignore unhandled events silently
      break;
  }
};

// ────────────────────────────────────────────────────────────────
//  Webhook Signature Verification
// ────────────────────────────────────────────────────────────────

export const verifyWebhookSignature = (
  rawBody: string | Buffer,
  signature: string,
): boolean => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;

  const expectedSignature = createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
};

// ────────────────────────────────────────────────────────────────
//  Refund via Paystack API
// ────────────────────────────────────────────────────────────────

export const initiateRefund = async (
  paymentId: string,
  amount?: number,
  reason?: string,
) => {
  const paymentSettings = await getPaymentSettings();
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found", 404);

  if (payment.status !== "success") {
    throw new AppError("Only successful payments can be refunded", 400);
  }

  if (payment.provider !== "paystack") {
    throw new AppError(
      "Refunds via API are only supported for Paystack payments",
      400,
    );
  }

  if (
    paymentSettings.refundWindowDays > 0 &&
    payment.paidAt &&
    Date.now() - payment.paidAt.getTime() >
      paymentSettings.refundWindowDays * 24 * 60 * 60 * 1000
  ) {
    throw new AppError("Refund window for this payment has expired", 400);
  }

  const refundAmountPesewas = amount
    ? Math.round(amount * 100)
    : Math.round(payment.amount * 100);

  if (amount && amount > payment.amount) {
    throw new AppError("Refund amount exceeds payment amount", 400);
  }

  const paystackRes = await paystackRequest<{
    data: { id: number; status: string };
  }>("POST", "/refund", {
    transaction: payment.providerRef,
    amount: refundAmountPesewas,
    ...(reason ? { merchant_note: reason } : {}),
  });

  // Update local record — final status will be confirmed via webhook
  payment.status = "refunded";
  payment.refundedAt = new Date();
  payment.refundAmount = amount || payment.amount;
  payment.metadata = {
    ...((payment.metadata as Record<string, unknown>) || {}),
    refundId: paystackRes.data.id,
    refundStatus: paystackRes.data.status,
  };
  await payment.save();

  await Order.findByIdAndUpdate(payment.order, { paymentStatus: "refunded" });

  return payment;
};
