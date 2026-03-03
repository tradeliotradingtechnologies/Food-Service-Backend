import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  processAndUpload,
  processAndUploadMany,
  deleteImage,
  deleteImages,
  type PresetName,
} from "../services/imageService.js";

// ── POST /api/uploads/single ────────────────────────────────────
// Upload & process a single image
// Form-data field: "image"
// Query params: ?preset=menuItem|category|avatar|thumbnail&folder=custom-folder
export const uploadSingleImage = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.file) {
      throw new AppError(
        "No image file provided. Use field name 'image'.",
        400,
      );
    }

    const preset = (req.query.preset as PresetName) || "menuItem";
    const folder = (req.query.folder as string) || "ericas-kitchen";

    const result = await processAndUpload(req.file.buffer, { preset, folder });

    res.status(201).json({
      status: "success",
      data: { image: result },
    });
  },
);

// ── POST /api/uploads/multiple ──────────────────────────────────
// Upload & process multiple images (max 10)
// Form-data field: "images"
// Query params: ?preset=menuItem|category|avatar|thumbnail&folder=custom-folder
export const uploadMultipleImages = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError(
        "No image files provided. Use field name 'images'.",
        400,
      );
    }

    const preset = (req.query.preset as PresetName) || "menuItem";
    const folder = (req.query.folder as string) || "ericas-kitchen";

    const buffers = files.map((f) => f.buffer);
    const results = await processAndUploadMany(buffers, { preset, folder });

    res.status(201).json({
      status: "success",
      results: results.length,
      data: { images: results },
    });
  },
);

// ── DELETE /api/uploads/:publicId ───────────────────────────────
// Delete a single image by Cloudinary public ID
export const deleteSingleImage = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Public IDs with folders use "/" which comes as nested params — reconstruct
    const publicId = req.params.publicId as string;

    if (!publicId) {
      throw new AppError("publicId parameter is required.", 400);
    }

    await deleteImage(publicId);

    res.status(200).json({
      status: "success",
      message: "Image deleted successfully",
    });
  },
);

// ── POST /api/uploads/delete-many ───────────────────────────────
// Delete multiple images by Cloudinary public IDs
export const deleteMultipleImages = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { publicIds } = req.body;

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new AppError("publicIds must be a non-empty array.", 400);
    }

    if (publicIds.length > 50) {
      throw new AppError("Cannot delete more than 50 images at once.", 400);
    }

    await deleteImages(publicIds);

    res.status(200).json({
      status: "success",
      message: `${publicIds.length} image(s) deleted successfully`,
    });
  },
);
