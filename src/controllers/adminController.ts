import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as adminService from "../services/adminService.js";

// ── User Management ─────────────────────────────────────────────

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllUsers({
    role: req.query.role as string | undefined,
    active:
      req.query.active !== undefined ? req.query.active === "true" : undefined,
    search: req.query.search as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.status(200).json({
    status: "success",
    results: result.users.length,
    data: result,
  });
});

export const getUserById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const user = await adminService.getUserById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  },
);

export const adminUpdateUser = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const user = await adminService.adminUpdateUser(
      req.params.id,
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      data: { user },
    });
  },
);

export const deactivateUser = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const user = await adminService.deactivateUser(req.params.id, req.user._id);
    res.status(200).json({
      status: "success",
      message: "User deactivated",
      data: { user },
    });
  },
);

// ── Profile (self) ──────────────────────────────────────────────

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.getProfile(req.user._id);
  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.updateProfile(req.user._id, req.body);
  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const getLinkedProviders = catchAsync(
  async (req: Request, res: Response) => {
    const providers = await adminService.getLinkedProviders(req.user._id);
    res.status(200).json({
      status: "success",
      results: providers.length,
      data: { providers },
    });
  },
);

// ── Role & Permission Management ────────────────────────────────

export const getAllRoles = catchAsync(async (_req: Request, res: Response) => {
  const roles = await adminService.getAllRoles();
  res.status(200).json({
    status: "success",
    results: roles.length,
    data: { roles },
  });
});

export const getRoleById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const role = await adminService.getRoleById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { role },
    });
  },
);

export const updateRolePermissions = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const role = await adminService.updateRolePermissions(
      req.params.id,
      req.body.permissions,
    );
    res.status(200).json({
      status: "success",
      data: { role },
    });
  },
);

export const getAllPermissions = catchAsync(
  async (_req: Request, res: Response) => {
    const permissions = await adminService.getAllPermissions();
    res.status(200).json({
      status: "success",
      results: permissions.length,
      data: { permissions },
    });
  },
);

// ── Audit Logs ──────────────────────────────────────────────

export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAuditLogs(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 50,
    {
      action: req.query.action as string | undefined,
      resource: req.query.resource as string | undefined,
      actor: req.query.actor as string | undefined,
    },
  );
  res.status(200).json({
    status: "success",
    results: result.logs.length,
    data: result,
  });
});

// ── Settings (super_admin only) ─────────────────────────────────

export const getAllSettings = catchAsync(
  async (_req: Request, res: Response) => {
    const settings = await adminService.getAllSettings();
    res.status(200).json({
      status: "success",
      data: { settings },
    });
  },
);

export const getSettingsByKey = catchAsync(
  async (
    req: Request<{
      key: "orders" | "reservations" | "payments" | "commission";
    }>,
    res: Response,
  ) => {
    const settings = await adminService.getSettingsByKey(req.params.key);
    res.status(200).json({
      status: "success",
      data: { settings },
    });
  },
);

export const updateOrderSettings = catchAsync(
  async (req: Request, res: Response) => {
    const settings = await adminService.updateOrderSettings(
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      message: "Order settings updated successfully",
      data: { settings },
    });
  },
);

export const updateReservationSettings = catchAsync(
  async (req: Request, res: Response) => {
    const settings = await adminService.updateReservationSettings(
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      message: "Reservation settings updated successfully",
      data: { settings },
    });
  },
);

export const updatePaymentSettings = catchAsync(
  async (req: Request, res: Response) => {
    const settings = await adminService.updatePaymentSettings(
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      message: "Payment settings updated successfully",
      data: { settings },
    });
  },
);

export const getProcessingFee = catchAsync(
  async (_req: Request, res: Response) => {
    const processingFee = await adminService.getProcessingFee();
    res.status(200).json({
      status: "success",
      data: { processingFee },
    });
  },
);

export const updateProcessingFee = catchAsync(
  async (req: Request, res: Response) => {
    const processingFee = await adminService.updateProcessingFee(
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      message: "Processing fee updated successfully",
      data: { processingFee },
    });
  },
);

export const getCommissionSettings = catchAsync(
  async (_req: Request, res: Response) => {
    const settings = await adminService.getCommissionSettingsForAdmin();
    res.status(200).json({
      status: "success",
      data: { settings },
    });
  },
);

export const updateCommissionSettings = catchAsync(
  async (req: Request, res: Response) => {
    const settings = await adminService.updateCommissionSettingsForAdmin(
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      message: "Commission settings updated successfully",
      data: { settings },
    });
  },
);

export const getTodayCommission = catchAsync(
  async (_req: Request, res: Response) => {
    const commission = await adminService.getTodayCommissionSummary();
    res.status(200).json({
      status: "success",
      data: { commission },
    });
  },
);

export const createPromoCode = catchAsync(
  async (req: Request, res: Response) => {
    const promoCode = await adminService.createPromoCode(
      req.body,
      req.user._id,
    );
    res.status(201).json({
      status: "success",
      data: { promoCode },
    });
  },
);

export const getPromoCodes = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getPromoCodes({
    isActive:
      req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined,
    includeExpired:
      req.query.includeExpired !== undefined
        ? req.query.includeExpired === "true"
        : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.status(200).json({
    status: "success",
    results: result.promoCodes.length,
    data: result,
  });
});

export const getPromoCodeById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const promoCode = await adminService.getPromoCodeById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { promoCode },
    });
  },
);

export const updatePromoCode = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const promoCode = await adminService.updatePromoCode(
      req.params.id,
      req.body,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      data: { promoCode },
    });
  },
);

export const invalidatePromoCode = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const promoCode = await adminService.invalidatePromoCode(
      req.params.id,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      message: "Promo code invalidated",
      data: { promoCode },
    });
  },
);

export const deletePromoCode = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await adminService.deletePromoCode(req.params.id, req.user._id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
