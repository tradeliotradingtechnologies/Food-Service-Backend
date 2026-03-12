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
