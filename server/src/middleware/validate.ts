import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * validate(schema) — validates req.body against a Zod schema.
 * Returns 400 with field-level error details on failure.
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      res.status(400).json({ error: "Validation Error", errors });
      return;
    }
    // Replace body with the parsed (and transformed) data
    req.body = result.data;
    next();
  };
