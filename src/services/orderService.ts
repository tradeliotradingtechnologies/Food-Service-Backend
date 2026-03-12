import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import MenuItem from "../models/menuItemModel.js";
import Address from "../models/addressModel.js";
import User from "../models/userModel.js";
import { getOrderSettings, getPaymentSettings } from "./appSettingsService.js";
import {
  reverseGeocodeCoordinates,
  validateCoordinates,
  buildDeliveryCoordinates,
} from "./geolocationService.js";
import AppError from "../utils/appError.js";
import type { PaymentMethod, OrderStatus } from "../types/model.types.js";

const UNPAID_PAYMENT_STATUSES = ["pending", "initiated", "failed"] as const;

const isUnpaidOrder = (paymentStatus: string) =>
  UNPAID_PAYMENT_STATUSES.includes(
    paymentStatus as (typeof UNPAID_PAYMENT_STATUSES)[number],
  );

export const buildDeliveryAddressSnapshot = (
  user: { name: string },
  address: {
    _id: unknown;
    label?: string;
    location: string;
    landmark?: string;
    gpsAddress?: string;
    phoneNumber: string;
  },
) => ({
  sourceAddressId: address._id as any,
  customerName: user.name,
  addressLabel: address.label,
  location: address.location,
  landmark: address.landmark,
  gpsAddress: address.gpsAddress,
  phoneNumber: address.phoneNumber,
});

export const syncPendingOrdersForAddress = async (
  userId: string,
  addressId: string,
  oldAddress: {
    label?: string;
    location: string;
    landmark?: string;
    gpsAddress?: string;
    phoneNumber: string;
  },
  newAddress: {
    _id: unknown;
    label?: string;
    location: string;
    landmark?: string;
    gpsAddress?: string;
    phoneNumber: string;
  },
) => {
  const user = await User.findById(userId).select("name");
  if (!user) return { matchedCount: 0, modifiedCount: 0 };

  const snapshot = buildDeliveryAddressSnapshot(user, newAddress);

  return Order.updateMany(
    {
      user: userId,
      status: "pending",
      paymentStatus: { $in: [...UNPAID_PAYMENT_STATUSES] },
      $or: [
        { "deliveryAddress.sourceAddressId": addressId },
        {
          "deliveryAddress.location": oldAddress.location,
          "deliveryAddress.phoneNumber": oldAddress.phoneNumber,
          "deliveryAddress.addressLabel": oldAddress.label ?? null,
          "deliveryAddress.landmark": oldAddress.landmark ?? null,
          "deliveryAddress.gpsAddress": oldAddress.gpsAddress ?? null,
        },
      ],
    },
    {
      $set: {
        deliveryAddress: snapshot,
      },
    },
  );
};

const resolveUserAddress = async (userId: string, addressId?: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  let address;
  if (addressId) {
    address = await Address.findOne({ _id: addressId, user: userId });
    if (!address)
      throw new AppError("The selected address was not found.", 404);
  } else {
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

  return { user, address };
};

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

  const { user, address } = await resolveUserAddress(userId, data.addressId);

  // Auto-build delivery details for the delivery person
  const deliveryAddress = buildDeliveryAddressSnapshot(user, address);

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
  const filter: Record<string, any> = { paymentStatus: "paid" };
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

  if (
    status === "cancelled" &&
    !["pending", "failed", "initiated"].includes(String(order.paymentStatus))
  ) {
    throw new AppError(
      "Paid orders cannot be cancelled. Refund the payment first if needed.",
      400,
    );
  }

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

export const confirmAllOrders = async (changedBy: string, note?: string) => {
  const pendingOrders = await Order.find({ status: "pending" }).select("_id");

  if (pendingOrders.length === 0) {
    return {
      confirmedCount: 0,
      orders: [],
    };
  }

  const orderIds = pendingOrders.map((order) => order._id);
  const changedAt = new Date();

  await Order.updateMany(
    { _id: { $in: orderIds } },
    {
      $set: { status: "confirmed" },
      $push: {
        statusHistory: {
          status: "confirmed",
          changedBy: changedBy as any,
          changedAt,
          note,
        },
      },
    },
  );

  const orders = await Order.find({ _id: { $in: orderIds } })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  return {
    confirmedCount: orders.length,
    orders,
  };
};

export const refreshOrderDeliveryAddress = async (
  orderId: string,
  changedBy: string,
  addressId?: string,
) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== "pending") {
    throw new AppError(
      "Only pending orders can have their delivery address refreshed.",
      400,
    );
  }

  if (!isUnpaidOrder(String(order.paymentStatus))) {
    throw new AppError(
      "Orders cannot have their delivery address refreshed after payment has been made.",
      400,
    );
  }

  const { user, address } = await resolveUserAddress(
    String(order.user),
    addressId,
  );
  order.deliveryAddress = buildDeliveryAddressSnapshot(user, address) as any;
  order.statusHistory.push({
    status: order.status,
    changedBy: changedBy as any,
    changedAt: new Date(),
    note: "Delivery address refreshed from saved address",
  });

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

  if (!isUnpaidOrder(String(order.paymentStatus))) {
    throw new AppError(
      "Orders cannot be cancelled after payment has been made.",
      400,
    );
  }

  const cancellable = ["pending"];
  if (!isAdmin && !cancellable.includes(order.status)) {
    throw new AppError(
      "Customers can only cancel orders when they are still pending",
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

/**
 * Captures delivery coordinates at order creation or during delivery
 * Performs reverse geocoding to get area name
 * Only available for pending/early-stage orders
 */
export const captureDeliveryCoordinates = async (
  orderId: string,
  latitude: number,
  longitude: number,
  accuracy?: number,
) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  // Check if order is in a stage where location capture makes sense
  const allowedStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
  ];
  if (!allowedStatuses.includes(order.status)) {
    throw new AppError(
      "Location can only be captured for pending, confirmed, preparing, or ready for pickup orders",
      400,
    );
  }

  // Validate coordinates
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.valid) {
    throw new AppError(validation.error || "Invalid coordinates", 400);
  }

  const deliveryCoordinates = buildDeliveryCoordinates(
    latitude,
    longitude,
    accuracy,
  );
  const areaName = await reverseGeocodeCoordinates(latitude, longitude);

  order.deliveryCoordinates = deliveryCoordinates as any;
  order.areaName = areaName || undefined;
  order.liveLocationUpdatedAt = new Date();

  await order.save();
  return order;
};

/**
 * Updates delivery location for pending orders (before dispatch)
 * Useful when customer moves or wants to update exact delivery spot
 */
export const updateDeliveryLocation = async (
  orderId: string,
  userId: string,
  latitude: number,
  longitude: number,
  accuracy?: number,
) => {
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  });
  if (!order) throw new AppError("Order not found", 404);

  // Only allow updates before dispatch
  if (!["pending", "confirmed", "preparing", "ready_for_pickup"].includes(order.status)) {
    throw new AppError(
      "Delivery location can only be updated before dispatch",
      400,
    );
  }

  if (!isUnpaidOrder(String(order.paymentStatus))) {
    throw new AppError(
      "Delivery location cannot be updated for paid orders",
      400,
    );
  }

  const validation = validateCoordinates(latitude, longitude);
  if (!validation.valid) {
    throw new AppError(validation.error || "Invalid coordinates", 400);
  }

  const deliveryCoordinates = buildDeliveryCoordinates(
    latitude,
    longitude,
    accuracy,
  );
  const areaName = await reverseGeocodeCoordinates(latitude, longitude);

  order.deliveryCoordinates = deliveryCoordinates as any;
  order.areaName = areaName || undefined;
  order.liveLocationUpdatedAt = new Date();

  await order.save();
  return order;
};

/**
 * Gets order with delivery coordinates for rider
 * Used by delivery rider to see where customer is
 */
export const getOrderForDelivery = async (orderId: string, riderId: string) => {
  const order = await Order.findOne({
    _id: orderId,
    assignedRider: riderId,
  })
    .populate("user", "name phoneNumber")
    .populate("items.menuItem", "name");

  if (!order) throw new AppError("Order not found or not assigned to you", 404);

  return order;
};

/**
 * Gets all orders with live coordinates for dispatch board
 * Useful for tracking delivery on map
 */
export const getOrdersForDispatchBoard = async (query: {
  status?: string;
  page: number;
  limit: number;
}) => {
  const filter: Record<string, any> = {
    paymentStatus: "paid",
    deliveryCoordinates: { $exists: true },
  };
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name phoneNumber")
      .populate("assignedRider", "name phoneNumber")
      .select(
        "orderNumber user deliveryAddress deliveryCoordinates areaName status assignedRider createdAt",
      )
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

