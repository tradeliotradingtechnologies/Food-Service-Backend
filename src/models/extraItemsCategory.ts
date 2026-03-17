import { Schema, model, type Document } from "mongoose";

export interface IExtraItemsCategory extends Document {
  name: string;
}

const ExtraItemsCategorySchema = new Schema<IExtraItemsCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ExtraItemsCategorySchema.virtual("items", {
  ref: "ExtraItem",
  localField: "_id",
  foreignField: "category",
});

const ExtraItemsCategory = model<IExtraItemsCategory>(
  "ExtraItemsCategory",
  ExtraItemsCategorySchema,
);

export default ExtraItemsCategory;
