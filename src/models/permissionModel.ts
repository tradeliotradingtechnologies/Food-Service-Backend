import { Schema, model } from "mongoose";
import type { IPermission } from "../types/model.types.js";
import {
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
} from "../types/model.types.js";

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: { type: String, required: true },
    resource: {
      type: String,
      required: true,
      enum: PERMISSION_RESOURCES,
    },
    action: {
      type: String,
      required: true,
      enum: PERMISSION_ACTIONS,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique: one permission per resource+action pair
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

const Permission = model<IPermission>("Permission", permissionSchema);

export default Permission;
