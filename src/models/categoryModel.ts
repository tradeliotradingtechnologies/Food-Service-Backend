import { Schema, model } from "mongoose";
import type { ICategory } from "../types/model.types.js";
import { softDeletePlugin } from "../utils/softDelete.js";

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

// Auto-generate slug from name before validation
categorySchema.pre("validate", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

categorySchema.plugin(softDeletePlugin);

const Category = model<ICategory>("Category", categorySchema);

export default Category;
