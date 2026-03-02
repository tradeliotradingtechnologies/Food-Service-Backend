import Testimonial from "../models/testimonialModel.js";
import AppError from "../utils/appError.js";

export const createTestimonial = async (
  userId: string,
  data: Record<string, any>,
) => {
  return Testimonial.create({ ...data, user: userId });
};

export const getApprovedTestimonials = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [testimonials, total] = await Promise.all([
    Testimonial.find({ isApproved: true })
      .populate("user", "name avatar")
      .populate("menuItem", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Testimonial.countDocuments({ isApproved: true }),
  ]);

  return {
    testimonials,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getFeaturedTestimonials = async () => {
  return Testimonial.find({ isApproved: true, isFeatured: true })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 })
    .limit(10);
};

export const getAllTestimonials = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [testimonials, total] = await Promise.all([
    Testimonial.find()
      .populate("user", "name email avatar")
      .populate("menuItem", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Testimonial.countDocuments(),
  ]);

  return {
    testimonials,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getUserTestimonials = async (userId: string) => {
  return Testimonial.find({ user: userId })
    .populate("menuItem", "name images")
    .sort({ createdAt: -1 });
};

export const updateTestimonial = async (
  id: string,
  userId: string,
  data: Record<string, any>,
) => {
  const testimonial = await Testimonial.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true },
  );
  if (!testimonial) throw new AppError("Testimonial not found", 404);
  return testimonial;
};

export const moderateTestimonial = async (
  id: string,
  adminId: string,
  data: { isApproved?: boolean; isFeatured?: boolean },
) => {
  const updateData: Record<string, any> = { ...data };
  if (data.isApproved !== undefined) {
    updateData.approvedBy = adminId;
  }

  const testimonial = await Testimonial.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!testimonial) throw new AppError("Testimonial not found", 404);
  return testimonial;
};

export const deleteTestimonial = async (id: string, userId?: string) => {
  const filter: Record<string, any> = { _id: id };
  if (userId) filter.user = userId;

  const testimonial = await Testimonial.findOneAndDelete(filter);
  if (!testimonial) throw new AppError("Testimonial not found", 404);
  return testimonial;
};
