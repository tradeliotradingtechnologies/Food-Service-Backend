import { Schema, model } from "mongoose";
import type { ICart, ICartItem } from "../types/model.types.js";

const selectedExtraSchema = new Schema(
  {
    extraItem: {
      type: Schema.Types.ObjectId,
      ref: "ExtraItem",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const cartItemSchema = new Schema<ICartItem>(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    selectedExtras: {
      type: [selectedExtraSchema],
      default: [],
    },
    lineTotal: { type: Number, required: true, min: 0, default: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One cart per user
    },
    items: [cartItemSchema],
    totalAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date }, // For guest carts
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  },
);

// Recalculate totalAmount before saving
cartSchema.pre("save", function () {
  this.items.forEach((item) => {
    const extrasTotal = (item.selectedExtras || []).reduce(
      (sum, extra) => sum + extra.unitPrice * extra.quantity,
      0,
    );
    item.lineTotal = (item.unitPrice + extrasTotal) * item.quantity;
  });

  this.totalAmount = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
});

const Cart = model<ICart>("Cart", cartSchema);

export default Cart;
