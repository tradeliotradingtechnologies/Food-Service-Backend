import { Schema, model } from "mongoose";
import type { IOAuthAccount } from "../types/model.types.js";
import { OAUTH_PROVIDERS } from "../types/model.types.js";

const oauthAccountSchema = new Schema<IOAuthAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      required: true,
      enum: OAUTH_PROVIDERS,
    },
    providerId: {
      type: String,
      required: true,
    },
    email: { type: String, lowercase: true },
    displayName: { type: String },
    avatar: { type: String },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    rawProfile: { type: Schema.Types.Mixed, select: false },
  },
  {
    timestamps: true,
  },
);

// One account per provider identity
oauthAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });
oauthAccountSchema.index({ user: 1 });

const OAuthAccount = model<IOAuthAccount>("OAuthAccount", oauthAccountSchema);

export default OAuthAccount;
