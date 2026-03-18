import Cart from "../models/cartModel.js";
import MenuItem from "../models/menuItemModel.js";
import ExtraItem from "../models/extraItems.js";
import AppError from "../utils/appError.js";

type SelectedExtraInput = {
  extraItem: string;
  quantity?: number;
};

type ResolvedSelectedExtra = {
  extraItem: any;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

const buildExtrasSignature = (
  selectedExtras: Array<{ extraItem: string; quantity: number }>,
) =>
  selectedExtras
    .map((extra) => `${extra.extraItem}:${extra.quantity}`)
    .sort()
    .join("|");

const resolveSelectedExtras = async (
  menuItem: any,
  selectedExtras: SelectedExtraInput[] = [],
) => {
  if (!selectedExtras.length) return [] as ResolvedSelectedExtra[];

  const normalized = selectedExtras.reduce((acc, extra) => {
    const qty = Number(extra.quantity || 1);
    if (!extra.extraItem) {
      throw new AppError("Extra item ID is required", 400);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      throw new AppError("Extra item quantity must be at least 1", 400);
    }

    acc.set(extra.extraItem, (acc.get(extra.extraItem) || 0) + qty);
    return acc;
  }, new Map<string, number>());

  const extraIds = [...normalized.keys()];
  const allowedExtraIds = new Set(
    (menuItem.extraItems || []).map((id: any) => id.toString()),
  );

  const disallowed = extraIds.find((id) => !allowedExtraIds.has(id));
  if (disallowed) {
    throw new AppError(
      "One or more selected extras are not available for this menu item",
      400,
    );
  }

  const extras = await ExtraItem.find({ _id: { $in: extraIds } });
  if (extras.length !== extraIds.length) {
    throw new AppError("One or more selected extras were not found", 404);
  }

  return extras.map((extra) => {
    const quantity = normalized.get(extra._id.toString()) || 1;
    return {
      extraItem: extra._id,
      name: extra.name,
      quantity,
      unitPrice: extra.price,
      lineTotal: extra.price * quantity,
    };
  });
};

const cartPopulate = [
  {
    path: "items.menuItem",
    select: "name price images isAvailable",
  },
  {
    path: "items.selectedExtras.extraItem",
    select: "name price",
  },
];

export const getCart = async (userId: string) => {
  let cart = await Cart.findOne({ user: userId }).populate(cartPopulate);

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

export const addToCart = async (
  userId: string,
  menuItemId: string,
  quantity: number,
  selectedExtras: SelectedExtraInput[] = [],
) => {
  const menuItem = await MenuItem.findById(menuItemId).select(
    "name price isAvailable extraItems",
  );
  if (!menuItem) throw new AppError("Menu item not found", 404);
  if (!menuItem.isAvailable)
    throw new AppError("Menu item is currently unavailable", 400);

  const resolvedSelectedExtras = await resolveSelectedExtras(
    menuItem,
    selectedExtras,
  );
  const extrasPerUnit = resolvedSelectedExtras.reduce(
    (sum, extra) => sum + extra.lineTotal,
    0,
  );
  const lineTotal = (menuItem.price + extrasPerUnit) * quantity;

  const extrasSignature = buildExtrasSignature(
    resolvedSelectedExtras.map((extra) => ({
      extraItem: extra.extraItem.toString(),
      quantity: extra.quantity,
    })),
  );

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [
        {
          menuItem: menuItemId,
          quantity,
          unitPrice: menuItem.price,
          selectedExtras: resolvedSelectedExtras,
          lineTotal,
          addedAt: new Date(),
        },
      ],
    });
  } else {
    const existingItem = cart.items.find(
      (item) =>
        item.menuItem.toString() === menuItemId &&
        buildExtrasSignature(
          (item.selectedExtras || []).map((extra) => ({
            extraItem: extra.extraItem.toString(),
            quantity: extra.quantity,
          })),
        ) === extrasSignature,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        menuItem: menuItemId as any,
        quantity,
        unitPrice: menuItem.price,
        selectedExtras: resolvedSelectedExtras as any,
        lineTotal,
        addedAt: new Date(),
      });
    }

    await cart.save();
  }

  return Cart.findOne({ user: userId }).populate(cartPopulate);
};

export const updateCartItem = async (
  userId: string,
  itemId: string,
  quantity: number,
  selectedExtras?: SelectedExtraInput[],
) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const item = cart.items.find((cartItem) => String(cartItem._id) === itemId);
  if (!item) throw new AppError("Item not in cart", 404);

  const menuItem = await MenuItem.findById(item.menuItem).select(
    "name price isAvailable extraItems",
  );
  if (!menuItem || !menuItem.isAvailable) {
    throw new AppError("Menu item is currently unavailable", 400);
  }

  item.quantity = quantity;

  if (selectedExtras) {
    item.selectedExtras = (await resolveSelectedExtras(
      menuItem,
      selectedExtras,
    )) as any;
  }

  await cart.save();

  return Cart.findOne({ user: userId }).populate(cartPopulate);
};

export const removeFromCart = async (userId: string, itemId: string) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const itemIndex = cart.items.findIndex((item) => String(item._id) === itemId);
  if (itemIndex === -1) throw new AppError("Item not in cart", 404);

  cart.items.splice(itemIndex, 1);
  await cart.save();

  return Cart.findOne({ user: userId }).populate(cartPopulate);
};

export const clearCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  cart.items = [] as any;
  await cart.save();

  return cart;
};
