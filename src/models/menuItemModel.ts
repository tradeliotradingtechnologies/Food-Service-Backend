import { Schema, model } from "mongoose";
import type { IMenuItem } from "../types/model.types.js";

const nutritionalInfoSchema = new Schema(
  {
    calories: { type: Number },
    protein: { type: Number },
    carbs: { type: Number },
    fat: { type: Number },
  },
  { _id: false },
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "GHS" },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length >= 1,
        message: "At least one image is required",
      },
    },
    preparationTime: { type: Number, required: true }, // minutes
    ingredients: [{ type: String, trim: true }],
    allergens: [{ type: String, trim: true }],
    nutritionalInfo: { type: nutritionalInfoSchema },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    likes: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────────
menuItemSchema.index({ category: 1, isAvailable: 1 });
menuItemSchema.index({ isFeatured: 1, isAvailable: 1 });
menuItemSchema.index({ price: 1 });
menuItemSchema.index({ name: "text", description: "text" });

// Auto-generate slug from name
menuItemSchema.pre("validate", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

const MenuItem = model<IMenuItem>("MenuItem", menuItemSchema);

export default MenuItem;
