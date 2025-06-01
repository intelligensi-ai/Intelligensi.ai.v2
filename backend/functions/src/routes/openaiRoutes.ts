import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";

/**
 * Sanitize text by removing HTML tags.
 * @param {string} text - The text to sanitize.
 * @return {string} - Sanitized text.
 */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

// Standalone Firebase Function with built-in CORS
export const updateHomepage = onRequest(
  {
    cors: true, // Firebase handles CORS automatically
  },
  async (req, res) => {
    try {
      // Handle preflight requests for CORS
      if (req.method === "OPTIONS") {
        res.status(204).send();
        return;
      }

      console.log("Received request:", req.method, req.path, req.body);

      const { text } = req.body || {};

      if (!text) {
        res.status(400).json({ error: "Text is required" });
        return;
      }

      const sanitizedText = sanitizeText(text);

      // Send the sanitized text to the Drupal API
      const drupalResponse = await axios.post(
        "https://drupal7.intelligensi.online/api/update-homepage",
        { update_text: sanitizedText },
        { headers: { "Content-Type": "application/json" } }
      );

      res.status(200).json({
        message: `Homepage updated successfully with: ${sanitizedText}`,
        drupalResponse: drupalResponse.data,
      });
    } catch (error) {
      console.error("Error in updateHomepage:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  }
);
