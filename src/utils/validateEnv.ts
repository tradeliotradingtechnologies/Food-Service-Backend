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

  // ── Client ────────────────────────────────────────────────────
  CLIENT_URL: z.url("Invalid CLIENT_URL").optional(),

  // ── OAuth (optional in dev, recommended in prod) ──────────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),

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
