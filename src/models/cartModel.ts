import { Schema, model } from "mongoose";
import type { ICart, ICartItem } from "../types/model.types.js";

const cartItemSchema = new Schema<ICartItem>(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
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
  this.totalAmount = this.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
});

const Cart = model<ICart>("Cart", cartSchema);

export default Cart;
