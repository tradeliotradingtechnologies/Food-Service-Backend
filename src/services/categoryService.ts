import Category from "../models/categoryModel.js";
import AppError from "../utils/appError.js";

export const createCategory = async (data: {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
}) => {
  return Category.create(data);
};

export const getAllCategories = async (includeInactive = false) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ sortOrder: 1, name: 1 });
};

export const getCategoryById = async (id: string) => {
  const category = await Category.findById(id);
  if (!category) throw new AppError("Category not found", 404);
  return category;
};

export const getCategoryBySlug = async (slug: string) => {
  const category = await Category.findOne({ slug });
  if (!category) throw new AppError("Category not found", 404);
  return category;
};

export const updateCategory = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    image: string;
    isActive: boolean;
    sortOrder: number;
  }>,
) => {
  const category = await Category.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new AppError("Category not found", 404);
  return category;
};

export const deleteCategory = async (id: string) => {
  const category = await Category.findByIdAndUpdate(
    id,
    { deletedAt: new Date() },
    { new: true },
  );
  if (!category) throw new AppError("Category not found", 404);
  return category;
};
