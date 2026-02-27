import { Document } from "mongoose";

export type UserRole = "customer" | "super_admin" | "admin";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: UserRole[];
  location: string;
  landMark: string;
  phoneNumber: string;
  active: boolean;
  passwordResetToken: string;
  passwordResetExpires: Date;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole extends Document {
  name: string;
  permissions: string[];
}
