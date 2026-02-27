import { Schema, model } from "mongoose";
import type { IUser } from "../types/model.types.js";

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordConfirm: {
    type: String,
    validate: [
      function (this: IUser, val: string) {
        return this.password === val;
      },
      "Passwords do not match",
    ],
  },
  role: [{ type: Schema.Types.ObjectId, ref: "Role", required: true }],
  location: { type: String },
  landMark: { type: String },
  phoneNumber: { type: String },
  active: { type: Boolean, default: true },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  passwordChangedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

const User = model("User", userSchema);

export default User;
