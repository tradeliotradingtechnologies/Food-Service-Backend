import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as addressService from "../services/addressService.js";

export const createAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  res.status(201).json({
    status: "success",
    data: { address },
  });
});

export const getUserAddresses = catchAsync(
  async (req: Request, res: Response) => {
    const addresses = await addressService.getUserAddresses(req.user._id);
    res.status(200).json({
      status: "success",
      results: addresses.length,
      data: { addresses },
    });
  },
);

export const getAddressById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const address = await addressService.getAddressById(
      req.params.id,
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      data: { address },
    });
  },
);

export const updateAddress = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const address = await addressService.updateAddress(
      req.params.id,
      req.user._id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: { address },
    });
  },
);

export const deleteAddress = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await addressService.deleteAddress(req.params.id, req.user._id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
