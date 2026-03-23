import { Schema, model } from "mongoose";
import type { IOrder } from "../types/model.types.js";
import {
  ORDER_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "../types/model.types.js";

const orderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true }, // Snapshot
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    extraItems: {
      type: [
        {
          extraItem: {
            type: Schema.Types.ObjectId,
            ref: "ExtraItem",
            required: true,
          },
          name: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 },
          unitPrice: { type: Number, required: true, min: 0 },
          lineTotal: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true, enum: ORDER_STATUSES },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false },
);

const deliveryAddressSchema = new Schema(
  {
    sourceAddressId: { type: Schema.Types.ObjectId, ref: "Address" },
    customerName: { type: String, required: true },
    addressLabel: { type: String },
    location: { type: String, required: true },
    landmark: { type: String },
    gpsAddress: { type: String },
    phoneNumber: { type: String, required: true },
  },
  { _id: false },
);

const deliveryCoordinatesSchema = new Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 }, // Accuracy radius in meters
    capturedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= 1,
        message: "Order must contain at least one item",
      },
    },
    orderType: {
      type: String,
      required: true,
      enum: ORDER_TYPES,
      default: "delivery",
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: function (this: IOrder) {
        return this.orderType === "delivery";
      },
    },
    deliveryFee: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    processingFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    statusHistory: [statusHistorySchema],
    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    assignedRider: { type: Schema.Types.ObjectId, ref: "User" },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    notes: { type: String, maxlength: 500 },
    cancellationReason: { type: String },
    deliveryCoordinates: { type: deliveryCoordinatesSchema },
    areaName: { type: String },
    liveLocationUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedRider: 1, status: 1 });

// Auto-generate order number: EK-YYYYMMDD-XXXX
orderSchema.pre("validate", async function () {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await model("Order").countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      },
    });
    this.orderNumber = `EK-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }
});

// Push initial status into statusHistory on create
orderSchema.pre("save", function () {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    } as any);
  }
});

const Order = model<IOrder>("Order", orderSchema);

export default Order;
