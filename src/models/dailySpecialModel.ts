import { Schema, model } from "mongoose";
import type { IDailySpecial } from "../types/model.types.js";
import { softDeletePlugin } from "../utils/softDelete.js";

const dailySpecialSchema = new Schema<IDailySpecial>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    date: { type: Date, required: true, default: () => new Date() },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ──────────────────────────────────────────────
dailySpecialSchema.index({ date: 1, isActive: 1 });

dailySpecialSchema.plugin(softDeletePlugin);

const DailySpecial = model<IDailySpecial>("DailySpecial", dailySpecialSchema);

export default DailySpecial;
