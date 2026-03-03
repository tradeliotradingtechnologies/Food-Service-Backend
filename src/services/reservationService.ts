import Reservation from "../models/reservationModel.js";
import AppError from "../utils/appError.js";
import type { ReservationStatus } from "../types/model.types.js";

// ── Create Reservation ──────────────────────────────────────────

export const createReservation = async (
  data: {
    guestName: string;
    guestEmail?: string;
    guestPhone: string;
    date: string | Date;
    time: string;
    partySize: number;
    specialRequests?: string;
  },
  userId?: string,
) => {
  const reservation = await Reservation.create({
    ...data,
    user: userId || undefined,
    date: new Date(data.date),
  });
  return reservation;
};

// ── Get All Reservations (admin, with filters) ──────────────────

export const getAllReservations = async (query: {
  status?: string;
  date?: string;
  page: number;
  limit: number;
}) => {
  const filter: Record<string, any> = {};

  if (query.status) filter.status = query.status;
  if (query.date) {
    const d = new Date(query.date);
    const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    filter.date = { $gte: d, $lt: nextDay };
  }

  const skip = (query.page - 1) * query.limit;
  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate("user", "name email")
      .populate("confirmedBy", "name")
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return {
    reservations,
    total,
    page: query.page,
    totalPages: Math.ceil(total / query.limit),
  };
};

// ── Get Upcoming Reservations ───────────────────────────────────

export const getUpcomingReservations = async (limit = 10) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Reservation.find({
    date: { $gte: todayStart },
    status: { $in: ["pending", "confirmed"] },
  })
    .sort({ date: 1, time: 1 })
    .limit(limit)
    .populate("user", "name email phoneNumber")
    .lean();
};

// ── Get Reservation By ID ───────────────────────────────────────

export const getReservationById = async (id: string) => {
  const reservation = await Reservation.findById(id)
    .populate("user", "name email phoneNumber")
    .populate("confirmedBy", "name");

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }
  return reservation;
};

// ── Update Reservation ──────────────────────────────────────────

export const updateReservation = async (
  id: string,
  data: {
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    date?: string | Date;
    time?: string;
    partySize?: number;
    tableNumber?: number;
    specialRequests?: string;
  },
) => {
  const updateData: Record<string, any> = { ...data };
  if (data.date) updateData.date = new Date(data.date);

  const reservation = await Reservation.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }
  return reservation;
};

// ── Update Reservation Status ───────────────────────────────────

export const updateReservationStatus = async (
  id: string,
  status: ReservationStatus,
  staffId: string,
  cancellationReason?: string,
) => {
  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["seated", "cancelled", "no_show"],
    seated: ["completed"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  const allowed = validTransitions[reservation.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(
      `Cannot transition from '${reservation.status}' to '${status}'`,
      400,
    );
  }

  reservation.status = status;
  if (status === "confirmed") reservation.confirmedBy = staffId as any;
  if (status === "cancelled" && cancellationReason) {
    reservation.cancellationReason = cancellationReason;
  }

  await reservation.save();
  return reservation;
};

// ── Cancel Reservation ──────────────────────────────────────────

export const cancelReservation = async (
  id: string,
  reason?: string,
  userId?: string,
) => {
  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  // Only owner or admin can cancel
  if (userId && reservation.user && reservation.user.toString() !== userId) {
    throw new AppError("You can only cancel your own reservations", 403);
  }

  if (["completed", "cancelled", "no_show"].includes(reservation.status)) {
    throw new AppError(
      `Cannot cancel a reservation with status '${reservation.status}'`,
      400,
    );
  }

  reservation.status = "cancelled";
  if (reason) reservation.cancellationReason = reason;
  await reservation.save();
  return reservation;
};

// ── Get User Reservations ───────────────────────────────────────

export const getUserReservations = async (userId: string) => {
  return Reservation.find({ user: userId }).sort({ date: -1, time: -1 }).lean();
};

// ── Delete Reservation ──────────────────────────────────────────

export const deleteReservation = async (id: string) => {
  const reservation = await Reservation.findByIdAndUpdate(
    id,
    { deletedAt: new Date() },
    { new: true },
  );
  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }
  return reservation;
};
