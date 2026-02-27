import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import Role from "../models/roleModel.js";
import User from "../models/userModel.js";

export const signup = catchAsync(async (req: Request, res: Response) => {
  const { role, ...payload } = req.body;

  let roleId = role;
  if (!roleId) {
    const defaultRole = await Role.findOne({ name: "user" });
    if (!defaultRole) {
      return res.status(500).json({
        status: "error",
        message: "Default role 'user' is not seeded",
      });
    }
    roleId = defaultRole._id;
  }

  const user = await User.create({
    ...payload,
    role: roleId,
  });

  res.status(201).json({
    status: "success",
    message: "User signed up successfully",
    data: {
      user,
    },
  });
});
