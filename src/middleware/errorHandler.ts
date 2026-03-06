import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";

// ── MongoDB / Mongoose Error Interfaces ─────────────────────────

interface MongooseCastError extends Error {
  kind: string;
  path: string;
  value: unknown;
}

interface MongooseDuplicateKeyError extends Error {
  code: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}

interface MongooseValidationError extends Error {
  errors: Record<
    string,
    { message: string; kind: string; path: string; value: unknown }
  >;
}

interface ZodValidationError extends Error {
  issues: {
    code: string;
    expected?: string;
    path: (string | number)[];
    message: string;
  }[];
}

// ── DB-Level Error Handlers ─────────────────────────────────────

/**
 * Mongoose CastError — e.g. invalid ObjectId format
 * Triggered when passing "abc" where a valid MongoDB ObjectId is expected.
 */
const handleCastErrorDB = (err: MongooseCastError): AppError => {
  const message = `Invalid ${err.path}: "${err.value}". Expected a valid ${err.kind}.`;
  return new AppError(message, 400);
};

/**
 * Mongoose error code 11000 — duplicate key
 * Triggered when attempting to insert a document that violates a unique index.
 */
const handleDuplicateFieldsDB = (err: MongooseDuplicateKeyError): AppError => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = err.keyValue?.[field];
  const message = `"${value}" already exists for "${field}". Please use a different value.`;
  return new AppError(message, 409);
};

/**
 * Mongoose ValidationError — schema-level validation failures
 * Triggered when a document fails schema validation rules (required, minlength, enum, etc.)
 */
const handleValidationErrorDB = (err: MongooseValidationError): AppError => {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

/**
 * Mongoose VersionError — document version conflict (optimistic concurrency)
 * Triggered when two concurrent updates modify the same document version.
 */
const handleVersionError = (): AppError => {
  return new AppError(
    "The document was modified by another request. Please try again.",
    409,
  );
};

/**
 * Mongoose StrictModeError — field not defined in schema
 * Triggered when strict mode is on and an unknown field is passed.
 */
const handleStrictModeError = (err: Error): AppError => {
  return new AppError(`Unknown field in request. ${err.message}`, 400);
};

// ── Auth / Token Error Handlers ─────────────────────────────────

/**
 * JWT — invalid token signature or structure
 */
const handleJWTError = (): AppError =>
  new AppError("Invalid authentication token. Please log in again.", 401);

/**
 * JWT — token has expired
 */
const handleJWTExpiredError = (): AppError =>
  new AppError("Your session has expired. Please log in again.", 401);

// ── Zod Validation Error Handler ────────────────────────────────

/**
 * Zod validation errors from the validate middleware.
 * Extracts field-level errors into a clean message.
 */
const handleZodError = (err: ZodValidationError): AppError => {
  const errors = err.issues.map((issue) => {
    // Strip internal wrapper segments (body / query / params) from path
    const cleanPath = issue.path
      .filter((seg) => !["body", "query", "params"].includes(String(seg)))
      .join(".");

    // When the field is completely missing, show "<field> is required"
    // instead of the raw Zod type message ("Expected string, received undefined")
    if (
      issue.code === "invalid_type" &&
      issue.message.includes("received undefined")
    ) {
      return `${cleanPath || "value"} is required`;
    }

    return cleanPath ? `${cleanPath} — ${issue.message}` : issue.message;
  });

  const message = `Validation failed: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// ── Response Helpers ────────────────────────────────────────────

/**
 * Development: return everything for debugging (full error object, stack trace)
 */
const sendErrorDev = (
  err: AppError & { [key: string]: any },
  res: Response,
) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Production: only return clean, user-safe messages
 * - Operational errors (AppError): send the message we crafted
 * - Programming/unknown errors: send generic message, log the real error
 */
const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    // Trusted operational error → send to client
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error → don't leak details
    console.error("💥 UNEXPECTED ERROR:", err);

    res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ── Global Error Middleware ──────────────────────────────────────

const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Safely read defaults without mutating the original error object,
  // which may have getter-only properties (e.g. Mongoose/Zod errors).
  const statusCode: number = err.statusCode || 500;
  const status: string = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    // Wrap in a plain object so sendErrorDev always has statusCode/status
    const devErr = {
      ...err,
      statusCode,
      status,
      message: err.message,
      stack: err.stack,
    };
    sendErrorDev(devErr, res);
  } else {
    // Start with a default production error; handlers below override it
    let error: AppError | null = null;

    // ── Mongoose / MongoDB Errors ────────────────────────────
    if (err.name === "CastError") {
      error = handleCastErrorDB(err);
    }
    if ((err as MongooseDuplicateKeyError).code === 11000) {
      error = handleDuplicateFieldsDB(err);
    }
    if (err.name === "ValidationError" && err.errors) {
      error = handleValidationErrorDB(err);
    }
    if (err.name === "VersionError") {
      error = handleVersionError();
    }
    if (err.name === "StrictModeError") {
      error = handleStrictModeError(err);
    }

    // ── Mongoose connection / timeout errors ─────────────────
    if (err.name === "MongoServerError" && err.code !== 11000) {
      error = new AppError(
        "A database error occurred. Please try again later.",
        500,
      );
    }
    if (err.name === "MongooseServerSelectionError") {
      error = new AppError(
        "Unable to connect to the database. Please try again later.",
        503,
      );
    }
    if (err.name === "MongoNetworkError") {
      error = new AppError(
        "Network error connecting to database. Please try again later.",
        503,
      );
    }
    if (
      err.name === "MongoTimeoutError" ||
      err.name === "MongoServerSelectionError"
    ) {
      error = new AppError(
        "Database request timed out. Please try again.",
        504,
      );
    }

    // ── JWT Errors ───────────────────────────────────────────
    if (err.name === "JsonWebTokenError") {
      error = handleJWTError();
    }
    if (err.name === "TokenExpiredError") {
      error = handleJWTExpiredError();
    }

    // ── Zod Errors ───────────────────────────────────────────
    if (err.name === "ZodError") {
      error = handleZodError(err);
    }

    // ── Payload Too Large ────────────────────────────────────
    if (err.type === "entity.too.large") {
      error = new AppError(
        "Request payload is too large. Maximum allowed size is 10KB.",
        413,
      );
    }

    // ── Malformed JSON ───────────────────────────────────────
    if (err.type === "entity.parse.failed") {
      error = new AppError(
        "Invalid JSON in request body. Please check your request format.",
        400,
      );
    }

    // ── CORS Error ───────────────────────────────────────────
    if (err.message?.includes("Not allowed by CORS")) {
      error = new AppError("Cross-origin request blocked.", 403);
    }

    // If no handler matched, wrap the original error as-is
    if (!error) {
      error = new AppError(err.message || "Something went wrong.", statusCode);
      error.isOperational = err.isOperational ?? false;
    }

    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;
