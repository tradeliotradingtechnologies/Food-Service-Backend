import MenuItem from "../models/menuItemModel.js";
import AppError from "../utils/appError.js";

interface MenuItemQuery {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  page: number;
  limit: number;
  sort?: string;
}

export const createMenuItem = async (
  data: Record<string, any>,
  userId: string,
) => {
  return MenuItem.create({ ...data, createdBy: userId });
};

export const getMenuItems = async (query: MenuItemQuery) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    isAvailable,
    isFeatured,
    page,
    limit,
    sort,
  } = query;

  const filter: Record<string, any> = {};

  if (category) filter.category = category;
  if (typeof isAvailable === "boolean") filter.isAvailable = isAvailable;
  if (typeof isFeatured === "boolean") filter.isFeatured = isFeatured;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  let sortObj: Record<string, any> = { createdAt: -1 };
  if (sort) {
    const sortFields = sort
      .split(",")
      .reduce((acc: Record<string, number>, field: string) => {
        const order = field.startsWith("-") ? -1 : 1;
        const key = field.replace(/^-/, "");
        acc[key] = order;
        return acc;
      }, {});
    sortObj = sortFields;
  }

  const [items, total] = await Promise.all([
    MenuItem.find(filter)
      .populate("category", "name slug")
      .populate("extraItems", "name price")
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    MenuItem.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getMenuItemById = async (id: string) => {
  const item = await MenuItem.findById(id)
    .populate("category", "name slug")
    .populate("extraItems", "name price category");
  if (!item) throw new AppError("Menu item not found", 404);
  return item;
};

export const getMenuItemBySlug = async (slug: string) => {
  const item = await MenuItem.findOne({ slug }).populate(
    "category",
    "name slug",
  );
  await item?.populate("extraItems", "name price category");
  if (!item) throw new AppError("Menu item not found", 404);
  return item;
};

export const updateMenuItem = async (id: string, data: Record<string, any>) => {
  const item = await MenuItem.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  })
    .populate("category", "name slug")
    .populate("extraItems", "name price category");
  if (!item) throw new AppError("Menu item not found", 404);
  return item;
};

export const deleteMenuItem = async (id: string) => {
  const item = await MenuItem.findByIdAndUpdate(
    id,
    { deletedAt: new Date() },
    { returnDocument: "after" },
  );
  if (!item) throw new AppError("Menu item not found", 404);
  return item;
};
