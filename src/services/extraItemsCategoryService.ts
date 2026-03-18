import ExtraItemsCategory from "../models/extraItemsCategory.js";
import AppError from "../utils/appError.js";

export const createExtraItemsCategory = async (data: { name: string }) => {
  return ExtraItemsCategory.create(data);
};

export const getAllExtraItemsCategories = async () => {
  return ExtraItemsCategory.find().sort({ name: 1 });
};

export const getExtraItemsCategoryById = async (id: string) => {
  const category = await ExtraItemsCategory.findById(id).populate(
    "items",
    "name price description category",
  );
  if (!category) throw new AppError("Extra items category not found", 404);
  return category;
};

export const updateExtraItemsCategory = async (
  id: string,
  data: Partial<{ name: string }>,
) => {
  const category = await ExtraItemsCategory.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!category) throw new AppError("Extra items category not found", 404);
  return category;
};

export const deleteExtraItemsCategory = async (id: string) => {
  const category = await ExtraItemsCategory.findByIdAndDelete(id);
  if (!category) throw new AppError("Extra items category not found", 404);
  return category;
};
