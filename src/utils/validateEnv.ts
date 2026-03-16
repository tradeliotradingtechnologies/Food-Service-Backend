import { z } from "zod/v4";

/**
 * Validates all required environment variables at startup.
 * Crashes early with a clear error message if anything is missing.
 */

const envSchema = z.object({
  // ── App ───────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  RUN_SEEDERS_ON_BOOT: z.enum(["true", "false", "auto"]).default("auto"),

  // ── Database ──────────────────────────────────────────────────
  DB_URI: z.url("Invalid DB_URI — must be a valid MongoDB connection string"),

  // ── JWT / Auth ────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // ── Bcrypt ────────────────────────────────────────────────────
  BCRYPT_SALT_ROUNDS: z.string().default("12"),

  // ── API Key (service-to-service gate) ────────────────────────
  API_KEY: z.string().min(32, "API_KEY must be at least 32 characters"),

  // ── Client ────────────────────────────────────────────────────
  CLIENT_URL: z.string().optional(),

  // ── OAuth (optional in dev, recommended in prod) ──────────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),

  // ── Cloudinary (required for image uploads) ───────────────────
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ── Paystack ──────────────────────────────────────────────────
  PAYSTACK_SECRET_KEY: z
    .string()
    .min(1, "PAYSTACK_SECRET_KEY is required")
    .optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_CALLBACK_URL: z.url("Invalid PAYSTACK_CALLBACK_URL").optional(),

  // ── SMTP (required in production) ─────────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment validation failed:");
    console.error(z.prettifyError(result.error));
    process.exit(1);
  }

  return result.data;
}
