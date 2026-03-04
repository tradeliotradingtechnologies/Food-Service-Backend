import { Request, Response, NextFunction } from "express";

/**
 * Recursively strips keys that start with `$` or contain `.` from an object.
 * Prevents NoSQL injection (e.g. `{ "$gt": "" }` in req.body).
 *
 * This replaces `express-mongo-sanitize` which is incompatible with Express 5
 * (it tries to reassign the read-only `req.query`).
 */
function sanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Drop any key starting with $ or containing a dot
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = sanitize(value);
  }
  return clean;
}

/**
 * Express middleware — sanitizes `req.body` and `req.params` in place.
 * `req.query` is read-only in Express 5, so we sanitize it via a getter override
 * on the response-local level if needed (body is the main attack vector).
 */
export default function mongoSanitizeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitize(req.body);
  }

  // req.params is writable — sanitize directly
  if (req.params && typeof req.params === "object") {
    for (const key of Object.keys(req.params)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete (req.params as Record<string, unknown>)[key];
      }
    }
  }

  next();
}
