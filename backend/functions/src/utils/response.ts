// Precedence version: simplified responder and HTML sanitizer
/**
 * Send a standardized JSON response with success flag.
 * @param {Object} res - Response-like object with status and json methods
 * @param {number} status - HTTP status code
 * @param {unknown} data - Response payload
 */
export function sendResponse(
  res: { status: (code: number) => { json: (data: unknown) => void; send?: (data: string) => void } },
  status: number,
  data: unknown
): void {
  res.status(status).json({
    success: status >= 200 && status < 300,
    data,
  });
}

/**
 * Remove HTML tags from a string.
 * @param {string} text - Input text containing HTML
 * @return {string} Sanitized plain text
 */
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}
