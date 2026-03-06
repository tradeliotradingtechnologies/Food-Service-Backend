import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import sharp from "sharp";

// ── Cloudinary configuration ────────────────────────────────────
// Lazy init: ESM hoists static imports before dotenv.config() runs,
// so env vars are undefined at module‑load time. Configure on first use.
let cloudinaryConfigured = false;
console.log("Cloudinary config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "****" : undefined,
});
function ensureCloudinaryConfig() {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinaryConfigured = true;
}

// ── Processing presets ──────────────────────────────────────────
interface ProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png" | "avif";
}

const PRESETS: Record<string, ProcessingOptions> = {
  menuItem: { width: 800, height: 600, quality: 80, format: "webp" },
  category: { width: 600, height: 400, quality: 80, format: "webp" },
  avatar: { width: 300, height: 300, quality: 75, format: "webp" },
  thumbnail: { width: 200, height: 200, quality: 70, format: "webp" },
};

export type PresetName = keyof typeof PRESETS;

// ── Image result ────────────────────────────────────────────────
export interface ImageResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

// ── Process buffer with sharp ───────────────────────────────────
export async function processImage(
  buffer: Buffer,
  preset: PresetName = "menuItem",
): Promise<Buffer> {
  const opts = PRESETS[preset] ?? PRESETS.menuItem;

  return sharp(buffer)
    .resize(opts.width, opts.height, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true, // never upscale
    })
    .toFormat(opts.format ?? "webp", { quality: opts.quality ?? 80 })
    .toBuffer();
}

// ── Upload buffer to Cloudinary ─────────────────────────────────
export function uploadToCloudinary(
  buffer: Buffer,
  folder: string = "ericas-kitchen",
): Promise<UploadApiResponse> {
  ensureCloudinaryConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "webp",
        transformation: [{ fetch_format: "auto", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

// ── Full pipeline: process → upload ─────────────────────────────
export async function processAndUpload(
  buffer: Buffer,
  options: { preset?: PresetName; folder?: string } = {},
): Promise<ImageResult> {
  const { preset = "menuItem", folder = "ericas-kitchen" } = options;

  const processed = await processImage(buffer, preset);
  const result = await uploadToCloudinary(processed, folder);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

// ── Batch process & upload ──────────────────────────────────────
export async function processAndUploadMany(
  buffers: Buffer[],
  options: { preset?: PresetName; folder?: string } = {},
): Promise<ImageResult[]> {
  return Promise.all(buffers.map((buf) => processAndUpload(buf, options)));
}

// ── Delete image from Cloudinary ────────────────────────────────
export async function deleteImage(publicId: string): Promise<void> {
  ensureCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId);
}

// ── Delete multiple images ──────────────────────────────────────
export async function deleteImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  ensureCloudinaryConfig();
  await cloudinary.api.delete_resources(publicIds);
}
