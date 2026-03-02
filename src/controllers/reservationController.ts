import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as reservationService from "../services/reservationService.js";

export const createReservation = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const reservation = await reservationService.createReservation(
      req.body,
      userId,
    );
    res.status(201).json({
      status: "success",
      data: { reservation },
    });
  },
);

export const getAllReservations = catchAsync(
  async (req: Request, res: Response) => {
    const result = await reservationService.getAllReservations({
      status: req.query.status as string | undefined,
      date: req.query.date as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.status(200).json({
      status: "success",
      results: result.reservations.length,
      data: result,
    });
  },
);

export const getUpcomingReservations = catchAsync(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 10;
    const reservations =
      await reservationService.getUpcomingReservations(limit);
    res.status(200).json({
      status: "success",
      results: reservations.length,
      data: { reservations },
    });
  },
);

export const getReservationById = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const reservation = await reservationService.getReservationById(
      req.params.id,
    );
    res.status(200).json({
      status: "success",
      data: { reservation },
    });
  },
);

export const updateReservation = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const reservation = await reservationService.updateReservation(
      req.params.id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: { reservation },
    });
  },
);

export const updateReservationStatus = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const reservation = await reservationService.updateReservationStatus(
      req.params.id,
      req.body.status,
      req.user._id,
      req.body.cancellationReason,
    );
    res.status(200).json({
      status: "success",
      data: { reservation },
    });
  },
);

export const cancelReservation = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const role = req.user.role as any;
    const isAdmin = ["super_admin", "admin", "staff"].includes(role?.name);
    const userId = isAdmin ? undefined : req.user._id;

    const reservation = await reservationService.cancelReservation(
      req.params.id,
      req.body.reason,
      userId,
    );
    res.status(200).json({
      status: "success",
      data: { reservation },
    });
  },
);

export const getUserReservations = catchAsync(
  async (req: Request, res: Response) => {
    const reservations = await reservationService.getUserReservations(
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      results: reservations.length,
      data: { reservations },
    });
  },
);

export const deleteReservation = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    await reservationService.deleteReservation(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
