import ExtraItem from "../models/extraItems.js";
import ExtraItemsCategory from "../models/extraItemsCategory.js";
import AppError from "../utils/appError.js";

export const createExtraItem = async (data: {
  name: string;
  price: number;
  description?: string;
  category: string;
}) => {
  const category = await ExtraItemsCategory.findById(data.category);
  if (!category) throw new AppError("Extra items category not found", 404);

  return ExtraItem.create(data);
};

export const getExtraItems = async (query: { category?: string }) => {
  const filter: Record<string, any> = {};

  if (query.category) {
    filter.category = query.category;
  }

  return ExtraItem.find(filter)
    .populate("category", "name")
    .sort({ category: 1, name: 1 });
};

export const getExtraItemById = async (id: string) => {
  const item = await ExtraItem.findById(id).populate("category", "name");
  if (!item) throw new AppError("Extra item not found", 404);
  return item;
};

export const updateExtraItem = async (
  id: string,
  data: Partial<{
    name: string;
    price: number;
    description?: string;
    category: string;
  }>,
) => {
  if (data.category) {
    const category = await ExtraItemsCategory.findById(data.category);
    if (!category) throw new AppError("Extra items category not found", 404);
  }

  const item = await ExtraItem.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).populate("category", "name");

  if (!item) throw new AppError("Extra item not found", 404);
  return item;
};

export const deleteExtraItem = async (id: string) => {
  const item = await ExtraItem.findByIdAndDelete(id);
  if (!item) throw new AppError("Extra item not found", 404);
  return item;
};
