import { Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: Types.ObjectId; // Assuming role is stored as a reference to Role model's ObjectId
}

export interface IRole extends Document {
  name: string;
  permissions: string[];
}       