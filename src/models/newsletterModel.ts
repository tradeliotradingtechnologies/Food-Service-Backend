import { Schema, model } from "mongoose";
import type { INewsletterSubscriber } from "../types/model.types.js";

const newsletterSubscriberSchema = new Schema<INewsletterSubscriber>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  isActive: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: { type: Date },
});

const NewsletterSubscriber = model<INewsletterSubscriber>(
  "NewsletterSubscriber",
  newsletterSubscriberSchema,
);

export default NewsletterSubscriber;
