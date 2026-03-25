import { Schema, model } from "mongoose";
import type { IPromoCode } from "../types/model.types.js";

const promoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: { type: String, trim: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    invalidatedAt: { type: Date },
    invalidatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ expiresAt: 1, isActive: 1 });

promoCodeSchema.pre("validate", function () {
  if (this.isModified("code") && this.code) {
    this.code = this.code.trim().toUpperCase();
  }
});

const PromoCode = model<IPromoCode>("PromoCode", promoCodeSchema);

export default PromoCode;
