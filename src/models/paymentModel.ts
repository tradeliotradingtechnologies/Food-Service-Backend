import { Schema, model } from "mongoose";
import type { IPayment } from "../types/model.types.js";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../types/model.types.js";

const paymentSchema = new Schema<IPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: false,
      unique: true, // 1:1 with order (if created)
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "GHS" },
    method: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
    },
    provider: { type: String }, // "MTN MoMo", "Paystack", etc.
    providerRef: { type: String }, // External transaction reference
    status: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: "initiated",
    },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
    cartSnapshot: { type: Schema.Types.Mixed }, // Store cart data at payment initiation
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ──────────────────────────────────────────────
paymentSchema.index({ providerRef: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = model<IPayment>("Payment", paymentSchema);

export default Payment;
