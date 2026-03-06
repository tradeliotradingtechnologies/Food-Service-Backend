import { Schema, Query, Aggregate } from "mongoose";

/**
 * Mongoose plugin that adds soft-delete support to any schema.
 *
 * What it does:
 * 1. Adds a `deletedAt` field (Date | null, default null) to the schema
 * 2. Adds query middleware to automatically exclude soft-deleted documents
 *    from find, findOne, findOneAndUpdate, countDocuments, and aggregate
 * 3. Provides a `softDelete()` instance method on documents
 *
 * Queries that already include a `deletedAt` condition are left untouched,
 * so you can explicitly query for deleted documents when needed:
 *   Model.find({ deletedAt: { $ne: null } })  // only deleted
 *   Model.find({ deletedAt: { $exists: true } })  // bypass filter
 */
export function softDeletePlugin(schema: Schema): void {
  // ── 1. Add deletedAt field ──────────────────────────────────────
  schema.add({
    deletedAt: { type: Date, default: null },
  });

  // Index for efficient filtering
  schema.index({ deletedAt: 1 });

  // ── 2. Query middleware (auto-exclude soft-deleted docs) ────────
  const queryHooks: string[] = [
    "find",
    "findOne",
    "findOneAndUpdate",
    "countDocuments",
    "findOneAndReplace",
  ];

  for (const hook of queryHooks) {
    schema.pre(hook as any, function (this: Query<any, any>) {
      const filter = this.getFilter();
      // Only add the filter if the query doesn't already mention deletedAt
      if (filter.deletedAt === undefined) {
        this.where({ deletedAt: null });
      }
    });
  }

  // ── 3. Aggregate middleware ─────────────────────────────────────
  schema.pre("aggregate" as any, function (this: Aggregate<any>) {
    const pipeline = this.pipeline();
    // Check if $match with deletedAt already exists in the first stage
    const firstStage = pipeline[0] as any;
    const hasDeletedAtMatch =
      firstStage?.$match && firstStage.$match.deletedAt !== undefined;

    if (!hasDeletedAtMatch) {
      this.pipeline().unshift({ $match: { deletedAt: null } });
    }
  });

  // ── 4. Instance method ──────────────────────────────────────────
  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save({ validateBeforeSave: false });
  };

  schema.methods.restore = function () {
    this.deletedAt = null;
    return this.save({ validateBeforeSave: false });
  };
}
