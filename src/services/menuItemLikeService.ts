import MenuItemLike from "../models/menuItemLikeModel.js";
import MenuItem from "../models/menuItemModel.js";
import AppError from "../utils/appError.js";

export const toggleLike = async (userId: string, menuItemId: string) => {
  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) throw new AppError("Menu item not found", 404);

  const existing = await MenuItemLike.findOne({
    user: userId,
    menuItem: menuItemId,
  });

  if (existing) {
    // Unlike
    await MenuItemLike.deleteOne({ _id: existing._id });
    await MenuItem.findByIdAndUpdate(menuItemId, { $inc: { likes: -1 } });
    return { liked: false, likes: menuItem.likes - 1 };
  }

  // Like
  await MenuItemLike.create({ user: userId, menuItem: menuItemId });
  await MenuItem.findByIdAndUpdate(menuItemId, { $inc: { likes: 1 } });
  return { liked: true, likes: menuItem.likes + 1 };
};

export const getUserLikes = async (userId: string) => {
  return MenuItemLike.find({ user: userId })
    .populate("menuItem", "name price images slug")
    .sort({ createdAt: -1 });
};

export const checkLikeStatus = async (userId: string, menuItemId: string) => {
  const like = await MenuItemLike.findOne({
    user: userId,
    menuItem: menuItemId,
  });
  return { liked: !!like };
};
