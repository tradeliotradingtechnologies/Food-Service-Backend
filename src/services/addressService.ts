import Address from "../models/addressModel.js";
import User from "../models/userModel.js";
import { syncPendingOrdersForAddress } from "./orderService.js";
import AppError from "../utils/appError.js";

export const createAddress = async (
  userId: string,
  data: Record<string, any>,
) => {
  // If this is set as default, unset other defaults first
  if (data.isDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
  }

  const address = await Address.create({ ...data, user: userId });

  // Add to user's addresses array
  await User.findByIdAndUpdate(userId, {
    $push: { addresses: address._id },
    ...(data.isDefault ? { defaultAddress: address._id } : {}),
  });

  return address;
};

export const getUserAddresses = async (userId: string) => {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

export const getAddressById = async (id: string, userId: string) => {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw new AppError("Address not found", 404);
  return address;
};

export const updateAddress = async (
  id: string,
  userId: string,
  data: Record<string, any>,
) => {
  const existingAddress = await Address.findOne({ _id: id, user: userId });
  if (!existingAddress) throw new AppError("Address not found", 404);

  if (data.isDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
    await User.findByIdAndUpdate(userId, { defaultAddress: id });
  }

  const address = await Address.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { returnDocument: "after", runValidators: true },
  );
  if (!address) throw new AppError("Address not found", 404);

  await syncPendingOrdersForAddress(
    userId,
    id,
    {
      label: existingAddress.label,
      location: existingAddress.location,
      landmark: existingAddress.landmark,
      gpsAddress: existingAddress.gpsAddress,
      phoneNumber: existingAddress.phoneNumber,
    },
    address,
  );

  return address;
};

export const deleteAddress = async (id: string, userId: string) => {
  const address = await Address.findOneAndUpdate(
    { _id: id, user: userId },
    { deletedAt: new Date() },
    { returnDocument: "after" },
  );
  if (!address) throw new AppError("Address not found", 404);

  await User.findByIdAndUpdate(userId, {
    $pull: { addresses: id },
    ...(address.isDefault ? { $unset: { defaultAddress: "" } } : {}),
  });

  return address;
};
