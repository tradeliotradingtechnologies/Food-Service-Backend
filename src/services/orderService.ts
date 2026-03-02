import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import MenuItem from "../models/menuItemModel.js";
import AppError from "../utils/appError.js";
import type { PaymentMethod, OrderStatus } from "../types/model.types.js";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const createOrder = async (
  userId: string,
  data: {
    deliveryAddress: {
      location: string;
      landmark?: string;
      gpsAddress?: string;
      phoneNumber: string;
    };
    paymentMethod: PaymentMethod;
    notes?: string;
  },
) => {
  // Get user's cart
  const cart = await Cart.findOne({ user: userId }).populate("items.menuItem");
  if (!cart || cart.items.length === 0) {
    throw new AppError(
      "Cart is empty. Add items before placing an order.",
      400,
    );
  }

  // Build order items from cart (snapshot)
  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const menuItem = await MenuItem.findById(cartItem.menuItem);
    if (!menuItem || !menuItem.isAvailable) {
      throw new AppError(
        `Menu item "${menuItem?.name || cartItem.menuItem}" is unavailable`,
        400,
      );
    }

    const lineTotal = menuItem.price * cartItem.quantity;
    orderItems.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      quantity: cartItem.quantity,
      unitPrice: menuItem.price,
      lineTotal,
    });
    subtotal += lineTotal;
  }

  const deliveryFee = 0; // Could be dynamic based on distance
  const tax = 0; // Could be dynamic based on tax rules
  const totalAmount = subtotal + deliveryFee + tax;

  const order = await Order.create({
    user: userId,
    items: orderItems,
    deliveryAddress: data.deliveryAddress,
    deliveryFee,
    subtotal,
    tax,
    totalAmount,
    paymentMethod: data.paymentMethod,
    notes: data.notes,
  });

  // Clear the cart after order creation
  cart.items = [] as any;
  await cart.save();

  return order;
};

export const getUserOrders = async (
  userId: string,
  query: { status?: string; page: number; limit: number },
) => {
  const filter: Record<string, any> = { user: userId };
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("items.menuItem", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getAllOrders = async (query: {
  status?: string;
  page: number;
  limit: number;
}) => {
  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .populate("assignedRider", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getOrderById = async (id: string, userId?: string) => {
  const filter: Record<string, any> = { _id: id };
  if (userId) filter.user = userId;

  const order = await Order.findOne(filter)
    .populate("user", "name email")
    .populate("items.menuItem", "name images")
    .populate("assignedRider", "name phoneNumber");
  if (!order) throw new AppError("Order not found", 404);
  return order;
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  changedBy: string,
  note?: string,
) => {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(status)) {
    throw new AppError(
      `Cannot transition from '${order.status}' to '${status}'`,
      400,
    );
  }

  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: changedBy as any,
    changedAt: new Date(),
    note,
  });

  if (status === "delivered") {
    order.deliveredAt = new Date();
  }

  await order.save();
  return order;
};

export const assignRider = async (orderId: string, riderId: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  if (order.status === "delivered" || order.status === "cancelled") {
    throw new AppError(
      "Cannot assign rider to a completed/cancelled order",
      400,
    );
  }

  order.assignedRider = riderId as any;
  await order.save();

  return Order.findById(orderId).populate("assignedRider", "name phoneNumber");
};

export const cancelOrder = async (
  id: string,
  userId: string,
  reason: string,
  isAdmin = false,
) => {
  const filter: Record<string, any> = { _id: id };
  if (!isAdmin) filter.user = userId;

  const order = await Order.findOne(filter);
  if (!order) throw new AppError("Order not found", 404);

  const cancellable = ["pending", "confirmed"];
  if (!isAdmin && !cancellable.includes(order.status)) {
    throw new AppError(
      "Order can only be cancelled when pending or confirmed",
      400,
    );
  }

  if (order.status === "delivered" || order.status === "cancelled") {
    throw new AppError("Order is already completed or cancelled", 400);
  }

  order.status = "cancelled";
  order.cancellationReason = reason;
  order.statusHistory.push({
    status: "cancelled",
    changedBy: userId as any,
    changedAt: new Date(),
    note: reason,
  });

  await order.save();
  return order;
};
