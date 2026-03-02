import { Schema, model } from "mongoose";
import type { IUser } from "../types/model.types.js";
import { AUTH_METHODS } from "../types/model.types.js";
import bcrypt from "bcrypt";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      // Required only for local auth
      required: function (this: IUser) {
        return this.authMethod === "local";
      },
    },
    passwordConfirm: {
      type: String,
      validate: {
        validator: function (this: IUser, val: string) {
          return this.password === val;
        },
        message: "Passwords do not match",
      },
    },
    authMethod: {
      type: String,
      enum: AUTH_METHODS,
      default: "local",
      required: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    avatar: { type: String },
    phoneNumber: { type: String },
    addresses: [{ type: Schema.Types.ObjectId, ref: "Address" }],
    defaultAddress: { type: Schema.Types.ObjectId, ref: "Address" },
    active: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date },
    passwordChangedAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ active: 1 });
userSchema.index({ passwordResetToken: 1 });

// ── Pre-save: hash password ──────────────────────────────
userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password") || !this.password) return;

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
  this.password = await bcrypt.hash(this.password, saltRounds);
  this.passwordConfirm = undefined;
});

// ── Pre-save: set passwordChangedAt ──────────────────────
userSchema.pre("save", function (this: IUser) {
  if (!this.isModified("password") || this.isNew) return;
  this.passwordChangedAt = new Date(Date.now() - 1000); // 1s buffer for JWT timing
});

// ── Instance methods ─────────────────────────────────────
userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (
  jwtTimestamp: number,
): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(
      this.passwordChangedAt.getTime() / 1000,
    );
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

const User = model<IUser>("User", userSchema);

export default User;
