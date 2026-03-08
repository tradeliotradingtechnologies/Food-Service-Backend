import DailySpecial from "../models/dailySpecialModel.js";
import AppError from "../utils/appError.js";

export const createDailySpecial = async (
  data: Record<string, any>,
  userId: string,
) => {
  return DailySpecial.create({ ...data, createdBy: userId });
};

export const getTodaySpecials = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return DailySpecial.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    isActive: true,
  })
    .populate({
      path: "menuItem",
      populate: { path: "category", select: "name slug" },
    })
    .sort({ sortOrder: 1 });
};

export const getAllDailySpecials = async () => {
  return DailySpecial.find()
    .populate({
      path: "menuItem",
      populate: { path: "category", select: "name slug" },
    })
    .sort({ date: -1, sortOrder: 1 });
};

export const getDailySpecialsByDate = async (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return DailySpecial.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate({
      path: "menuItem",
      populate: { path: "category", select: "name slug" },
    })
    .sort({ sortOrder: 1 });
};

export const getDailySpecialById = async (id: string) => {
  const special = await DailySpecial.findById(id).populate("menuItem");
  if (!special) throw new AppError("Daily special not found", 404);
  return special;
};

export const updateDailySpecial = async (
  id: string,
  data: Record<string, any>,
) => {
  const special = await DailySpecial.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("menuItem");
  if (!special) throw new AppError("Daily special not found", 404);
  return special;
};

export const deleteDailySpecial = async (id: string) => {
  const special = await DailySpecial.findByIdAndUpdate(
    id,
    { deletedAt: new Date() },
    { new: true },
  );
  if (!special) throw new AppError("Daily special not found", 404);
  return special;
};
