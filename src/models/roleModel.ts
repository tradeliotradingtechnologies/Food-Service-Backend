import { Schema, model } from "mongoose";
import type { IRole } from "../types/model.types.js";
import { ROLE_NAMES } from "../types/model.types.js";

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ROLE_NAMES,
    },
    description: { type: String, required: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
    isDefault: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const Role = model<IRole>("Role", roleSchema);

export default Role;
