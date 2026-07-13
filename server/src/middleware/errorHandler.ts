import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Central error handler — must have 4 params to be recognised as an Express error handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : "Something went wrong";

  // Log unexpected errors in detail
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
      message: err.message,
      stack: err.stack,
      body: req.body,
    });
  }

  res.status(statusCode).json({
    error: err.name || "Error",
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/** Wrap async route handlers to forward errors to the central handler */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
