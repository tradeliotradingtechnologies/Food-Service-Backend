import { Schema, model } from "mongoose";
import type { IAddress } from "../types/model.types.js";

const addressSchema = new Schema<IAddress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    label: { type: String, trim: true }, // "Home", "Office"
    location: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    gpsAddress: { type: String, trim: true }, // Ghana Post GPS: GA-XXX-XXXX
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
    phoneNumber: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ──────────────────────────────────────────────
addressSchema.index({ user: 1 });
addressSchema.index({ coordinates: "2dsphere" });

const Address = model<IAddress>("Address", addressSchema);

export default Address;
