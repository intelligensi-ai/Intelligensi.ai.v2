// Text utility helpers
/**
 * Remove HTML tags from a string.
 * @param {string} text Input string that may contain HTML tags
 * @return {string} The input with all HTML tags stripped
 */
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

/**
 * Truncate a string to a maximum length.
 * @param {string} text Input string to truncate
 * @param {number} max Maximum length to keep
 * @return {string} Truncated string (or empty string if input is not a string)
 */
export function truncateString(text: string, max: number): string {
  if (typeof text !== "string") return "";
  return text.length > max ? text.slice(0, max) : text;
}
