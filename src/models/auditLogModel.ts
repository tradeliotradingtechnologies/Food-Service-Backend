import { Schema, model } from "mongoose";
import type { IAuditLog } from "../types/model.types.js";

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["success", "failure"],
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ──────────────────────────────────────────────
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
// TTL: auto-purge after 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
