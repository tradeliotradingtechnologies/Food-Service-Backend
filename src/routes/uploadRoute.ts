import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { uploadSingle, uploadMultiple } from "../utils/multer.js";
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteSingleImage,
  deleteMultipleImages,
} from "../controllers/uploadController.js";

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// ── Upload single image ─────────────────────────────────────────
// POST /api/uploads/single?preset=menuItem&folder=menu-items
router.post("/single", uploadSingle, uploadSingleImage);

// ── Upload multiple images (staff / admin only) ─────────────────
// POST /api/uploads/multiple?preset=menuItem&folder=menu-items
router.post(
  "/multiple",
  authorize("menu", "create"),
  uploadMultiple,
  uploadMultipleImages,
);

// ── Delete single image (admin only) ────────────────────────────
// DELETE /api/uploads/:publicId
router.delete("/:publicId", authorize("menu", "delete"), deleteSingleImage);

// ── Delete multiple images (admin only) ──────────────────────────
// POST /api/uploads/delete-many
router.post("/delete-many", authorize("menu", "delete"), deleteMultipleImages);

export default router;
