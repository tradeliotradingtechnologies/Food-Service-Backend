import { Schema, model } from "mongoose";
import type { IMenuItemLike } from "../types/model.types.js";

const menuItemLikeSchema = new Schema<IMenuItemLike>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// One like per user per item
menuItemLikeSchema.index({ user: 1, menuItem: 1 }, { unique: true });

const MenuItemLike = model<IMenuItemLike>("MenuItemLike", menuItemLikeSchema);

export default MenuItemLike;
