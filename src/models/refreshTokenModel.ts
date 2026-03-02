import { Schema, model } from "mongoose";
import type { IRefreshToken } from "../types/model.types.js";

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    family: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedBy: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ──────────────────────────────────────────────
refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ token: 1 });
// TTL: auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);

export default RefreshToken;
