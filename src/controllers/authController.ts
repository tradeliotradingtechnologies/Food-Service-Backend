import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";

export const signup = catchAsync(async (req: Request, res: Response) => {
  res.status(201).json({
    status: "success",
    message: "User signed up successfully",
  });
});
