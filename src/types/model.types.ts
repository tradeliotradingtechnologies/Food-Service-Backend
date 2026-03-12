import { Document, Types } from "mongoose";

// ──────────────────────────────── Enums / Literals ────────────────────────────────

export const PERMISSION_RESOURCES = [
  "user",
  "menu",
  "order",
  "category",
  "testimonial",
  "report",
  "setting",
  "daily_special",
  "payment",
  "oauth",
  "auth",
  "reservation",
  "analytics",
] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const PERMISSION_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "manage",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ROLE_NAMES = [
  "super_admin",
  "admin",
  "staff",
  "delivery_rider",
  "customer",
] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const AUTH_METHODS = ["local", "google", "apple", "mixed"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const OAUTH_PROVIDERS = ["google", "apple"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = [
  "mobile_money",
  "card",
  "cash_on_delivery",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "initiated",
  "pending",
  "success",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ──────────────────────────────── Soft Delete ────────────────────────────────

export interface ISoftDeletable {
  deletedAt: Date | null;
  softDelete(): Promise<this>;
  restore(): Promise<this>;
}

// ──────────────────────────────── Permission ────────────────────────────────

export interface IPermission extends Document {
  name: string;
  description: string;
  resource: PermissionResource;
  action: PermissionAction;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Role ────────────────────────────────

export interface IRole extends Document {
  name: RoleName;
  description: string;
  permissions: Types.ObjectId[] | IPermission[];
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── User ────────────────────────────────

export interface IUser extends Document, ISoftDeletable {
  name: string;
  email: string;
  password?: string;
  passwordConfirm?: string;
  authMethod: AuthMethod;
  role: Types.ObjectId | IRole;
  avatar?: string;
  phoneNumber?: string;
  addresses: Types.ObjectId[];
  defaultAddress?: Types.ObjectId;
  active: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  correctPassword(
    candidatePassword: string,
    userPassword: string,
  ): Promise<boolean>;
  changedPasswordAfter(jwtTimestamp: number): boolean;
  isLocked(): boolean;
}

// ──────────────────────────────── OAuth Account ────────────────────────────────

export interface IOAuthAccount extends Document {
  user: Types.ObjectId | IUser;
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  rawProfile?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Refresh Token ────────────────────────────────

export interface IRefreshToken extends Document {
  user: Types.ObjectId | IUser;
  token: string;
  family: string;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  replacedBy?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

// ──────────────────────────────── Address ────────────────────────────────

export interface IAddress extends Document, ISoftDeletable {
  user: Types.ObjectId | IUser;
  label?: string;
  location: string;
  landmark?: string;
  gpsAddress?: string;
  coordinates?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  phoneNumber: string;
  isDefault: boolean;
  createdAt: Date;
}

// ──────────────────────────────── Category ────────────────────────────────

export interface ICategory extends Document, ISoftDeletable {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Menu Item ────────────────────────────────

export interface INutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface IMenuItem extends Document, ISoftDeletable {
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  category: Types.ObjectId | ICategory;
  images: string[];
  preparationTime: number;
  ingredients: string[];
  allergens: string[];
  nutritionalInfo?: INutritionalInfo;
  isAvailable: boolean;
  isFeatured: boolean;
  likes: number;
  averageRating: number;
  totalReviews: number;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Daily Special ────────────────────────────────

export interface IDailySpecial extends Document, ISoftDeletable {
  title: string;
  description: string;
  menuItem: Types.ObjectId | IMenuItem;
  date: Date;
  isActive: boolean;
  sortOrder: number;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
}

// ──────────────────────────────── Cart ────────────────────────────────

export interface ICartItem {
  menuItem: Types.ObjectId | IMenuItem;
  quantity: number;
  unitPrice: number;
  addedAt: Date;
}

export interface ICart extends Document {
  user: Types.ObjectId | IUser;
  items: ICartItem[];
  totalAmount: number;
  expiresAt?: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Order ────────────────────────────────

export interface IOrderItem {
  menuItem: Types.ObjectId | IMenuItem;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  changedBy?: Types.ObjectId | IUser;
  changedAt: Date;
  note?: string;
}

export interface IDeliveryAddress {
  sourceAddressId?: Types.ObjectId;
  customerName: string;
  addressLabel?: string;
  location: string;
  landmark?: string;
  gpsAddress?: string;
  phoneNumber: string;
}

export interface IDeliveryCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // Accuracy radius in meters
  capturedAt: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId | IUser;
  items: IOrderItem[];
  deliveryAddress: IDeliveryAddress;
  deliveryFee: number;
  subtotal: number;
  processingFee: number;
  tax: number;
  totalAmount: number;
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  assignedRider?: Types.ObjectId | IUser;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  notes?: string;
  cancellationReason?: string;
  deliveryCoordinates?: IDeliveryCoordinates;
  areaName?: string; // Reverse-geocoded area/neighborhood from coordinates
  liveLocationUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── App Settings ────────────────────────────────

export interface IProcessingFee {
  type: "fixed" | "percentage";
  amount: number;
}

export interface IOrderSettings {
  orderingEnabled: boolean;
  processingFee: IProcessingFee;
  taxRate: number;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
}

export interface IReservationSettings {
  reservationsEnabled: boolean;
  minPartySize: number;
  maxPartySize: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  openingTime: string;
  closingTime: string;
}

export interface IPaymentSettings {
  currency: string;
  enabledMethods: PaymentMethod[];
  paystackEnabled: boolean;
  allowManualConfirmation: boolean;
  refundWindowDays: number;
}

export interface IAppSettingsMap {
  orders: IOrderSettings;
  reservations: IReservationSettings;
  payments: IPaymentSettings;
}

export type AppSettingKey = keyof IAppSettingsMap;

export interface IAppSettings extends Document {
  key: AppSettingKey | "processing_fee";
  value:
    | IOrderSettings
    | IReservationSettings
    | IPaymentSettings
    | IProcessingFee
    | unknown;
  description?: string;
  updatedBy?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Payment ────────────────────────────────

export interface IPayment extends Document {
  order: Types.ObjectId | IOrder;
  user: Types.ObjectId | IUser;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider?: string;
  providerRef?: string;
  status: PaymentStatus;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ──────────────────────────────── Testimonial ────────────────────────────────

export interface ITestimonial extends Document, ISoftDeletable {
  user: Types.ObjectId | IUser;
  content: string;
  rating: number;
  menuItem?: Types.ObjectId | IMenuItem;
  isApproved: boolean;
  isFeatured: boolean;
  approvedBy?: Types.ObjectId | IUser;
  createdAt: Date;
}

// ──────────────────────────────── Menu Item Like ────────────────────────────────

export interface IMenuItemLike extends Document {
  user: Types.ObjectId | IUser;
  menuItem: Types.ObjectId | IMenuItem;
  createdAt: Date;
}

// ──────────────────────────────── Newsletter Subscriber ────────────────────────────────

export interface INewsletterSubscriber extends Document {
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

// ──────────────────────────────── Reservation ────────────────────────────────

export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface IReservation extends Document, ISoftDeletable {
  reservationNumber: string;
  user?: Types.ObjectId | IUser;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  date: Date;
  time: string; // e.g. "19:00"
  partySize: number;
  tableNumber?: number;
  status: ReservationStatus;
  specialRequests?: string;
  confirmedBy?: Types.ObjectId | IUser;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────── Audit Log ────────────────────────────────

export interface IAuditLog extends Document {
  actor?: Types.ObjectId | IUser;
  action: string;
  resource: string;
  resourceId?: Types.ObjectId;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
