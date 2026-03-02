import NewsletterSubscriber from "../models/newsletterModel.js";
import AppError from "../utils/appError.js";

export const subscribe = async (email: string) => {
  const existing = await NewsletterSubscriber.findOne({ email });

  if (existing) {
    if (existing.isActive) {
      throw new AppError("Email is already subscribed", 409);
    }
    // Resubscribe
    existing.isActive = true;
    existing.subscribedAt = new Date();
    existing.unsubscribedAt = undefined;
    await existing.save();
    return existing;
  }

  return NewsletterSubscriber.create({ email });
};

export const unsubscribe = async (email: string) => {
  const subscriber = await NewsletterSubscriber.findOne({
    email,
    isActive: true,
  });
  if (!subscriber) throw new AppError("Email is not subscribed", 404);

  subscriber.isActive = false;
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  return subscriber;
};

export const getAllSubscribers = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [subscribers, total] = await Promise.all([
    NewsletterSubscriber.find({ isActive: true })
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit),
    NewsletterSubscriber.countDocuments({ isActive: true }),
  ]);

  return {
    subscribers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getSubscriberCount = async () => {
  return NewsletterSubscriber.countDocuments({ isActive: true });
};
