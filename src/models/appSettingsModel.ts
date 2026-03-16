import { Schema, model } from "mongoose";

/**
 * Generic key–value store for system-wide settings.
 * Keys are unique strings (e.g. "processing_fee").
 * Values are schema-free Mixed so the same collection can hold any setting shape.
 */
const appSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// appSettingsSchema.index({ key: 1 });

const AppSettings = model("AppSettings", appSettingsSchema);

export default AppSettings;
