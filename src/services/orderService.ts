import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import MenuItem from "../models/menuItemModel.js";
import Address from "../models/addressModel.js";
import User from "../models/userModel.js";
import { getOrderSettings, getPaymentSettings } from "./appSettingsService.js";
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
    addressId?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  },
) => {
  const [orderSettings, paymentSettings] = await Promise.all([
    getOrderSettings(),
    getPaymentSettings(),
  ]);

  if (!orderSettings.orderingEnabled) {
    throw new AppError("Ordering is currently unavailable.", 503);
  }

  if (!paymentSettings.enabledMethods.includes(data.paymentMethod)) {
    throw new AppError(
      `Payment method '${data.paymentMethod}' is currently unavailable.`,
      400,
    );
  }

  // Ensure the customer has a saved address
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  let address;
  if (data.addressId) {
    address = await Address.findOne({ _id: data.addressId, user: userId });
    if (!address)
      throw new AppError("The selected address was not found.", 404);
  } else {
    // Fall back to default address, then any address
    address =
      (user.defaultAddress
        ? await Address.findOne({ _id: user.defaultAddress, user: userId })
        : null) ??
      (await Address.findOne({ user: userId }).sort({
        isDefault: -1,
        createdAt: -1,
      }));
  }

  if (!address) {
    throw new AppError(
      "You must have at least one saved address before placing an order. Please add an address first.",
      400,
    );
  }

  // Auto-build delivery details for the delivery person
  const deliveryAddress = {
    customerName: user.name,
    addressLabel: address.label,
    location: address.location,
    landmark: address.landmark,
    gpsAddress: address.gpsAddress,
    phoneNumber: address.phoneNumber,
  };

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

  const deliveryFee =
    orderSettings.freeDeliveryThreshold !== null &&
    subtotal >= orderSettings.freeDeliveryThreshold
      ? 0
      : orderSettings.deliveryFee;

  const processingFee =
    orderSettings.processingFee.type === "percentage"
      ? +((subtotal * orderSettings.processingFee.amount) / 100).toFixed(2)
      : orderSettings.processingFee.amount;

  const tax = +((subtotal * orderSettings.taxRate) / 100).toFixed(2);

  const totalAmount = subtotal + deliveryFee + processingFee + tax;

  const order = await Order.create({
    user: userId,
    items: orderItems,
    deliveryAddress,
    deliveryFee,
    subtotal,
    processingFee,
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
