import multer from "multer";
import AppError from "./appError.js";

// ── Allowed image MIME types ────────────────────────────────────
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Store in memory — we'll process with sharp before uploading ─
const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, AVIF, GIF`,
        400,
      ) as any,
    );
  }
};

/**
 * Single image upload — field name "image"
 * Usage: `router.post("/", uploadSingle, controller)`
 */
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("image");

/**
 * Avatar upload — field name "avatar"
 * Usage: `router.patch("/update-profile", uploadAvatar, controller)`
 */
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("avatar");

/**
 * Multiple image upload — field name "images", max 10
 * Usage: `router.post("/", uploadMultiple, controller)`
 */
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array("images", 10);
