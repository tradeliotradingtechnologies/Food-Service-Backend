import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import * as testimonialService from "../services/testimonialService.js";

export const createTestimonial = catchAsync(
  async (req: Request, res: Response) => {
    const testimonial = await testimonialService.createTestimonial(
      req.user._id,
      req.body,
    );
    res.status(201).json({
      status: "success",
      data: { testimonial },
    });
  },
);

export const getApprovedTestimonials = catchAsync(
  async (req: Request, res: Response) => {
    const result = await testimonialService.getApprovedTestimonials(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({
      status: "success",
      results: result.testimonials.length,
      data: result,
    });
  },
);

export const getFeaturedTestimonials = catchAsync(
  async (_req: Request, res: Response) => {
    const testimonials = await testimonialService.getFeaturedTestimonials();
    res.status(200).json({
      status: "success",
      results: testimonials.length,
      data: { testimonials },
    });
  },
);

export const getAllTestimonials = catchAsync(
  async (req: Request, res: Response) => {
    const result = await testimonialService.getAllTestimonials(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({
      status: "success",
      results: result.testimonials.length,
      data: result,
    });
  },
);

export const getUserTestimonials = catchAsync(
  async (req: Request, res: Response) => {
    const testimonials = await testimonialService.getUserTestimonials(
      req.user._id,
    );
    res.status(200).json({
      status: "success",
      results: testimonials.length,
      data: { testimonials },
    });
  },
);

export const updateTestimonial = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const testimonial = await testimonialService.updateTestimonial(
      req.params.id,
      req.user._id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: { testimonial },
    });
  },
);

export const moderateTestimonial = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    const testimonial = await testimonialService.moderateTestimonial(
      req.params.id,
      req.user._id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      data: { testimonial },
    });
  },
);

export const deleteTestimonial = catchAsync(
  async (req: Request<{ id: string }>, res: Response) => {
    // Admin can delete any, user can only delete their own
    const role = req.user.role as any;
    const isAdmin = ["super_admin", "admin"].includes(role?.name);
    const userId = isAdmin ? undefined : req.user._id;

    await testimonialService.deleteTestimonial(req.params.id, userId);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
