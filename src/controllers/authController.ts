import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

const signToken = (userId: string) => {
  // In a real application, you would use a secret from environment variables
  const secret: string = process.env.JWT_SECRET!;
  // const expiresIn: string = process.env.JWT_EXPIRES_IN!;
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: "90d",
  });
  return token;
};

// Set JWT in HTTP-only cookie;
const createSendToken = (user: any, res: Response) => {
  const token = signToken(user._id);
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "strict", // Prevent CSRF
    maxAge: parseInt(process.env.JWT_EXPIRES_IN!) * 24 * 60 * 60 * 1000, // 90days
  });
};

export const signup = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, passwordConfirm } = req.body;
  const user = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: ["customer"],
  });

  createSendToken(user, res);

  res.status(201).json({
    status: "success",
    message: "User signed up successfully",
    data: {
      user,
    },
  });
});
