import { Schema, model } from "mongoose";

export interface IExtraItem {
  name: string;
  price: number;
  description?: string;
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
  },
  {
    _id: false,
  },
);

const ExtraItem = model<IExtraItem>("ExtraItem", extraItemSchema);

export default ExtraItem;
