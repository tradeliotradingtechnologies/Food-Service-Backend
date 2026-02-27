import { Schema, model, Document } from "mongoose";
import type { IUser } from "../types/model.types.js";
import bcrypt from "bcrypt";

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  passwordConfirm: {
    type: String,
    validate: [
      function (this: IUser, val: string) {
        return this.password === val;
      },
      "Passwords do not match",
    ],
  },
  role: [
    {
      type: String,
      enum: ["customer", "super_admin", "admin"],
      default: "customer",
      required: true,
    },
  ],
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

userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) return;
  await bcrypt
    .hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS!))
    .then((hashedPassword: string) => {
      this.password = hashedPassword;
    });

  this.passwordConfirm = undefined as any; // Remove passwordConfirm field before saving
});
const User = model("User", userSchema);

export default User;
