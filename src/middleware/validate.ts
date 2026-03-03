// middleware/validate.ts
import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      // Forward all errors (Zod or otherwise) to the global error handler
      next(error);
    }
  };

export default validate;