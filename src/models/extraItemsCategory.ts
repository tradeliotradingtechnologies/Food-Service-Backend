import { Schema, model, type Document } from "mongoose";
import { extraItemSchema, type IExtraItem } from "./extraItems.js";

export interface IExtraItemsCategory extends Document {
  name: string;
  items: IExtraItem[];
}

const ExtraItemsCategorySchema = new Schema<IExtraItemsCategory>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  items: [extraItemSchema],
});

const ExtraItemsCategory = model<IExtraItemsCategory>(
  "ExtraItemsCategory",
  ExtraItemsCategorySchema,
);

export default ExtraItemsCategory;
