import { Schema, model } from "mongoose";
import type { ITestimonial } from "../types/model.types.js";
import { softDeletePlugin } from "../utils/softDelete.js";

const testimonialSchema = new Schema<ITestimonial>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem" },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ──────────────────────────────────────────────
testimonialSchema.index({ isFeatured: 1, isApproved: 1 });
testimonialSchema.index({ menuItem: 1, isApproved: 1 });

testimonialSchema.plugin(softDeletePlugin);

const Testimonial = model<ITestimonial>("Testimonial", testimonialSchema);

export default Testimonial;
