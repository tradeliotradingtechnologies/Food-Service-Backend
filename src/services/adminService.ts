import User from "../models/userModel.js";
import Role from "../models/roleModel.js";
import Permission from "../models/permissionModel.js";
import OAuthAccount from "../models/oauthAccountModel.js";
import AuditLog from "../models/auditLogModel.js";
import PromoCode from "../models/promoCodeModel.js";
import Order from "../models/orderModel.js";
import {
  getAllSettingSections,
  getCommissionSettings,
  getOrderSettings,
  getSettingSection,
  updateSettingSection,
} from "./appSettingsService.js";
import AppError from "../utils/appError.js";
import type {
  AppSettingKey,
  ICommissionSettings,
  IOrderSettings,
  IPaymentSettings,
  IPromoCode,
  IProcessingFee,
  IReservationSettings,
} from "../types/model.types.js";

// ── User Management ─────────────────────────────────────────────

export const getAllUsers = async (query: {
  role?: string;
  active?: boolean;
  search?: string;
  page: number;
  limit: number;
}) => {
  const filter: Record<string, any> = {};

  if (query.role) {
    const role = await Role.findOne({ name: query.role });
    if (role) filter.role = role._id;
  }
  if (typeof query.active === "boolean") filter.active = query.active;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [users, total] = await Promise.all([
    User.find(filter)
      .populate("role", "name description")
      .select("-password -passwordResetToken -emailVerificationToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getUserById = async (id: string) => {
  const user = await User.findById(id)
    .populate("role", "name description permissions")
    .populate("addresses")
    .select("-password -passwordResetToken -emailVerificationToken");
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const adminUpdateUser = async (
  id: string,
  data: Record<string, any>,
  adminId: string,
) => {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);

  const before = { role: user.role, active: user.active };

  if (data.role) {
    const role = await Role.findById(data.role);
    if (!role) throw new AppError("Role not found", 404);
    user.role = role._id as any;
  }
  if (data.name !== undefined) user.name = data.name;
  if (data.email !== undefined) user.email = data.email;
  if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
  if (data.active !== undefined) user.active = data.active;
  if (data.emailVerified !== undefined) user.emailVerified = data.emailVerified;

  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    actor: adminId,
    action: "user.admin_update",
    resource: "user",
    resourceId: user._id,
    changes: { before, after: data },
    status: "success",
  });

  return User.findById(id).populate("role", "name description");
};

export const deactivateUser = async (id: string, adminId: string) => {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);

  user.deletedAt = new Date();
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    actor: adminId,
    action: "user.deactivate",
    resource: "user",
    resourceId: user._id,
    status: "success",
  });

  return user;
};

// ── Profile (self) ──────────────────────────────────────────────

export const getProfile = async (userId: string) => {
  return getUserById(userId);
};

export const updateProfile = async (
  userId: string,
  data: { name?: string; phoneNumber?: string; avatar?: string },
) => {
  const user = await User.findByIdAndUpdate(userId, data, {
    returnDocument: "after",
    runValidators: true,
  })
    .populate("role", "name")
    .select("-password -passwordResetToken -emailVerificationToken");
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const getLinkedProviders = async (userId: string) => {
  return OAuthAccount.find({ user: userId }).select(
    "provider email displayName createdAt",
  );
};

// ── Role Management ─────────────────────────────────────────────

export const getAllRoles = async () => {
  return Role.find().populate(
    "permissions",
    "name description resource action",
  );
};

export const getRoleById = async (id: string) => {
  const role = await Role.findById(id).populate(
    "permissions",
    "name description resource action",
  );
  if (!role) throw new AppError("Role not found", 404);
  return role;
};

export const updateRolePermissions = async (
  id: string,
  permissionIds: string[],
) => {
  const role = await Role.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.isSystem && role.name === "super_admin") {
    throw new AppError("Cannot modify super_admin permissions", 403);
  }

  role.permissions = permissionIds as any;
  await role.save();

  return Role.findById(id).populate(
    "permissions",
    "name description resource action",
  );
};

// ── App Settings ────────────────────────────────────────────────

const auditSettingsUpdate = async (
  key: AppSettingKey,
  before: unknown,
  after: unknown,
  adminId: string,
  action = `settings.update_${key}`,
) => {
  await AuditLog.create({
    actor: adminId,
    action,
    resource: "settings",
    changes: {
      before: before as Record<string, unknown>,
      after: after as Record<string, unknown>,
    },
    status: "success",
  });
};

export const getAllSettings = async () => {
  return getAllSettingSections();
};

export const getSettingsByKey = async (key: AppSettingKey) => {
  return getSettingSection(key);
};

export const updateOrderSettings = async (
  data: Partial<IOrderSettings>,
  adminId: string,
) => {
  const before = await getOrderSettings();
  const settings = await updateSettingSection("orders", data, adminId);
  await auditSettingsUpdate("orders", before, settings, adminId);
  return settings;
};

export const updateReservationSettings = async (
  data: Partial<IReservationSettings>,
  adminId: string,
) => {
  const before = await getSettingSection("reservations");
  const settings = await updateSettingSection("reservations", data, adminId);
  await auditSettingsUpdate("reservations", before, settings, adminId);
  return settings;
};

export const updatePaymentSettings = async (
  data: Partial<IPaymentSettings>,
  adminId: string,
) => {
  const before = await getSettingSection("payments");
  const settings = await updateSettingSection("payments", data, adminId);
  await auditSettingsUpdate("payments", before, settings, adminId);
  return settings;
};

export const getProcessingFee = async (): Promise<IProcessingFee> => {
  const settings = await getOrderSettings();
  return settings.processingFee;
};

export const updateProcessingFee = async (
  data: IProcessingFee,
  adminId: string,
): Promise<IProcessingFee> => {
  const before = await getOrderSettings();
  const settings = await updateSettingSection(
    "orders",
    { processingFee: data },
    adminId,
  );

  await auditSettingsUpdate(
    "orders",
    before,
    settings,
    adminId,
    "settings.update_processing_fee",
  );

  return settings.processingFee;
};

export const getCommissionSettingsForAdmin = async () => {
  return getCommissionSettings();
};

export const updateCommissionSettingsForAdmin = async (
  data: Partial<ICommissionSettings>,
  adminId: string,
) => {
  const nextPercentage = data.percentage;
  if (
    typeof nextPercentage === "number" &&
    (nextPercentage < 0 || nextPercentage > 100)
  ) {
    throw new AppError("Commission percentage must be between 0 and 100", 400);
  }

  const before = await getCommissionSettings();
  const settings = await updateSettingSection("commission", data, adminId);
  await auditSettingsUpdate(
    "commission",
    before,
    settings,
    adminId,
    "settings.update_commission",
  );
  return settings;
};

export const getTodayCommissionSummary = async () => {
  const settings = await getCommissionSettings();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [aggregate] = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lt: endOfDay },
        paymentStatus: "success",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = Number(aggregate?.totalRevenue || 0);
  const ordersCount = Number(aggregate?.ordersCount || 0);
  const commissionAmount = settings.enabled
    ? +((totalRevenue * settings.percentage) / 100).toFixed(2)
    : 0;

  return {
    date: startOfDay.toISOString().slice(0, 10),
    settings,
    ordersCount,
    totalRevenue,
    commissionAmount,
  };
};

const ensurePromoCodeNotExpired = (expiresAt: Date) => {
  if (expiresAt.getTime() <= Date.now()) {
    throw new AppError("Promo code has expired", 400);
  }
};

const toAuditRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
};

export const createPromoCode = async (
  data: {
    code: string;
    description?: string;
    expiresAt: Date;
    isActive?: boolean;
  },
  adminId: string,
) => {
  ensurePromoCodeNotExpired(data.expiresAt);

  const promoCode = await PromoCode.create({
    ...data,
    createdBy: adminId,
    updatedBy: adminId,
    code: data.code.trim().toUpperCase(),
  });

  await AuditLog.create({
    actor: adminId,
    action: "promo_code.create",
    resource: "promo_code",
    resourceId: promoCode._id,
    changes: { after: toAuditRecord(promoCode.toObject()) },
    status: "success",
  });

  return promoCode;
};

export const getPromoCodes = async (query: {
  isActive?: boolean;
  includeExpired?: boolean;
  page: number;
  limit: number;
}) => {
  const filter: Record<string, unknown> = {};
  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;
  if (!query.includeExpired) filter.expiresAt = { $gt: new Date() };

  const skip = (query.page - 1) * query.limit;
  const [promoCodes, total] = await Promise.all([
    PromoCode.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("invalidatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    PromoCode.countDocuments(filter),
  ]);

  return {
    promoCodes,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getPromoCodeById = async (id: string) => {
  const promoCode = await PromoCode.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .populate("invalidatedBy", "name email");
  if (!promoCode) throw new AppError("Promo code not found", 404);
  return promoCode;
};

export const updatePromoCode = async (
  id: string,
  data: {
    code?: string;
    description?: string;
    expiresAt?: Date;
    isActive?: boolean;
  },
  adminId: string,
) => {
  if (data.expiresAt) {
    ensurePromoCodeNotExpired(data.expiresAt);
  }

  const promoCode = await PromoCode.findById(id);
  if (!promoCode) throw new AppError("Promo code not found", 404);

  const before = toAuditRecord(promoCode.toObject());
  if (data.code !== undefined) promoCode.code = data.code.trim().toUpperCase();
  if (data.description !== undefined) promoCode.description = data.description;
  if (data.expiresAt !== undefined) promoCode.expiresAt = data.expiresAt;
  if (data.isActive !== undefined) promoCode.isActive = data.isActive;
  promoCode.updatedBy = adminId as any;
  await promoCode.save();

  await AuditLog.create({
    actor: adminId,
    action: "promo_code.update",
    resource: "promo_code",
    resourceId: promoCode._id,
    changes: { before, after: toAuditRecord(promoCode.toObject()) },
    status: "success",
  });

  return promoCode;
};

export const invalidatePromoCode = async (id: string, adminId: string) => {
  const promoCode = await PromoCode.findById(id);
  if (!promoCode) throw new AppError("Promo code not found", 404);

  const before = toAuditRecord(promoCode.toObject());
  promoCode.isActive = false;
  promoCode.invalidatedAt = new Date();
  promoCode.invalidatedBy = adminId as any;
  promoCode.updatedBy = adminId as any;
  await promoCode.save();

  await AuditLog.create({
    actor: adminId,
    action: "promo_code.invalidate",
    resource: "promo_code",
    resourceId: promoCode._id,
    changes: { before, after: toAuditRecord(promoCode.toObject()) },
    status: "success",
  });

  return promoCode;
};

export const deletePromoCode = async (id: string, adminId: string) => {
  const promoCode = await PromoCode.findById(id);
  if (!promoCode) throw new AppError("Promo code not found", 404);

  await PromoCode.deleteOne({ _id: id });

  await AuditLog.create({
    actor: adminId,
    action: "promo_code.delete",
    resource: "promo_code",
    resourceId: promoCode._id,
    changes: { before: toAuditRecord(promoCode.toObject()) },
    status: "success",
  });
};

// ── Permission Management ───────────────────────────────────────
export const getAllPermissions = async () => {
  return Permission.find().sort({ resource: 1, action: 1 });
};

// ── Audit Logs ──────────────────────────────────────────────────

export const getAuditLogs = async (
  page: number,
  limit: number,
  filters?: { action?: string; resource?: string; actor?: string },
) => {
  const filter: Record<string, any> = {};
  if (filters?.action)
    filter.action = { $regex: filters.action, $options: "i" };
  if (filters?.resource) filter.resource = filters.resource;
  if (filters?.actor) filter.actor = filters.actor;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actor", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};
