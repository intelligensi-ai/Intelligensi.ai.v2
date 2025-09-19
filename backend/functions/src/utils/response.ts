/* Utility helpers for consistent HTTP responses and text sanitization */
import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Send a standardized JSON response.
 * @param res Express response
 * @param status HTTP status code
 * @param payload Payload to send
 */
export function sendResponse<T>(
  res: Response,
  status: number,
  payload: ApiResponse<T>
): void {
  res.status(status).json(payload);
}

/**
 * Very small sanitizer to normalize whitespace and trim text.
 */
export function sanitizeText(input: unknown, fallback = ""): string {
  if (typeof input !== "string") return fallback;
  return input.replace(/\s+/g, " ").trim();
}
