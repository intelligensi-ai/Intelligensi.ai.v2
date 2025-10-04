// Lightweight HTTP helpers
/**
 * Sends a JSON response with a standard success flag and payload.
 * @param {Object} res Express-like response object with status().json() chain
 * @param {number} status HTTP status code to send
 * @param {unknown} data Arbitrary payload to include in the response body
 * @return {void}
 */
export function sendResponse(
  res: { status: (code: number) => { json: (data: unknown) => void } },
  status: number,
  data: unknown
): void {
  res.status(status).json({
    success: status >= 200 && status < 300,
    data,
  });
}
