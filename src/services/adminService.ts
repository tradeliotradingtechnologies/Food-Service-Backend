import User from "../models/userModel.js";
import Role from "../models/roleModel.js";
import Permission from "../models/permissionModel.js";
import OAuthAccount from "../models/oauthAccountModel.js";
import AuditLog from "../models/auditLogModel.js";
import AppSettings from "../models/appSettingsModel.js";
import AppError from "../utils/appError.js";
import type { IProcessingFee } from "../types/model.types.js";

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

// ── Permission Management ───────────────────────────────────────const DEFAULT_PROCESSING_FEE: IProcessingFee = { type: "fixed", amount: 0 };

export const getProcessingFee = async (): Promise<IProcessingFee> => {
  const setting = await AppSettings.findOne({ key: "processing_fee" });
  return (setting?.value as IProcessingFee) ?? DEFAULT_PROCESSING_FEE;
};

export const updateProcessingFee = async (
  data: IProcessingFee,
  adminId: string,
): Promise<IProcessingFee> => {
  const setting = await AppSettings.findOneAndUpdate(
    { key: "processing_fee" },
    {
      value: data,
      updatedBy: adminId,
      description: "Order processing fee charged on each order",
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );

  await AuditLog.create({
    actor: adminId,
    action: "settings.update_processing_fee",
    resource: "settings",
    resourceId: setting?._id,
    changes: { after: data },
    status: "success",
  });

  return setting?.value as IProcessingFee;
};

// ── Permission Management ──────────────────────────────────────────
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
