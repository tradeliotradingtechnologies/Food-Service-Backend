import { Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: Types.ObjectId;
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
