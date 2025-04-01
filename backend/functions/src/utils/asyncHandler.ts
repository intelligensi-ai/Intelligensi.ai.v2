import type { Request, Response, NextFunction } from "express";

/**
 * A wrapper to handle async route handlers properly.
 * Automatically catches errors and forwards them to `next()`.
 *
 * @param {Function} fn - The async route handler function to wrap
 * @return {Function} A middleware function that properly handles async operations
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

export default asyncHandler;
