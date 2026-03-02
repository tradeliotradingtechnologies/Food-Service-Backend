import Cart from "../models/cartModel.js";
import MenuItem from "../models/menuItemModel.js";
import AppError from "../utils/appError.js";

export const getCart = async (userId: string) => {
  let cart = await Cart.findOne({ user: userId }).populate(
    "items.menuItem",
    "name price images isAvailable",
  );

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

export const addToCart = async (
  userId: string,
  menuItemId: string,
  quantity: number,
) => {
  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) throw new AppError("Menu item not found", 404);
  if (!menuItem.isAvailable)
    throw new AppError("Menu item is currently unavailable", 400);

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [
        {
          menuItem: menuItemId,
          quantity,
          unitPrice: menuItem.price,
          addedAt: new Date(),
        },
      ],
    });
  } else {
    const existingItem = cart.items.find(
      (item) => item.menuItem.toString() === menuItemId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        menuItem: menuItemId as any,
        quantity,
        unitPrice: menuItem.price,
        addedAt: new Date(),
      });
    }

    await cart.save();
  }

  return Cart.findOne({ user: userId }).populate(
    "items.menuItem",
    "name price images isAvailable",
  );
};

export const updateCartItem = async (
  userId: string,
  menuItemId: string,
  quantity: number,
) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const item = cart.items.find(
    (item) => item.menuItem.toString() === menuItemId,
  );
  if (!item) throw new AppError("Item not in cart", 404);

  item.quantity = quantity;
  await cart.save();

  return Cart.findOne({ user: userId }).populate(
    "items.menuItem",
    "name price images isAvailable",
  );
};

export const removeFromCart = async (userId: string, menuItemId: string) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const itemIndex = cart.items.findIndex(
    (item) => item.menuItem.toString() === menuItemId,
  );
  if (itemIndex === -1) throw new AppError("Item not in cart", 404);

  cart.items.splice(itemIndex, 1);
  await cart.save();

  return Cart.findOne({ user: userId }).populate(
    "items.menuItem",
    "name price images isAvailable",
  );
};

export const clearCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  cart.items = [] as any;
  await cart.save();

  return cart;
};
