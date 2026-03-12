import { Schema, model } from "mongoose";
import type { IReservation } from "../types/model.types.js";
import { RESERVATION_STATUSES } from "../types/model.types.js";
import { softDeletePlugin } from "../utils/softDelete.js";

const reservationSchema = new Schema<IReservation>(
  {
    reservationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    guestPhone: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    partySize: {
      type: Number,
      required: true,
      min: 1,
    },
    tableNumber: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      enum: RESERVATION_STATUSES,
      default: "pending",
    },
    specialRequests: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────────
reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ user: 1 });
reservationSchema.index({ guestPhone: 1 });
// reservationNumber index already created by `unique: true` on the field

// Auto-generate reservation number: RES-YYYYMMDD-XXXX
reservationSchema.pre("validate", async function () {
  if (this.isNew && !this.reservationNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await Reservation.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        ),
      },
    });
    this.reservationNumber = `RES-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }
});

reservationSchema.plugin(softDeletePlugin);

const Reservation = model<IReservation>("Reservation", reservationSchema);
export default Reservation;
