import { Schema, model, type Document, type Types } from "mongoose";

export interface IExtraItem extends Document {
  name: string;
  price: number;
  description?: string;
  category: Types.ObjectId;
}

export const extraItemSchema = new Schema<IExtraItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ExtraItemsCategory",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const ExtraItem = model<IExtraItem>("ExtraItem", extraItemSchema);

export default ExtraItem;
