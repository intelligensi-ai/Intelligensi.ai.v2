import axios, { AxiosError } from "axios";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

// Define Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

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
    secrets: [openaiApiKey], // Correctly uses the secret
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

      const { prompt } = req.body || {};

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      const openAIResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          tools: [
            {
              type: "function",
              function: {
                name: "update_homepage",
                strict: false,
                parameters: {
                  type: "object",
                  required: ["updateText"],
                  properties: {
                    updateText: {
                      type: "string",
                      description: "The text to update the homepage with.",
                    },
                  },
                },
                description: "Updates the homepage with the provided text.",
              },
            },
          ],
          temperature: 1,
          max_tokens: 2048,
          response_format: { type: "text" },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey.value()}`,
          },
        }
      );

      const toolCall = openAIResponse.data.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.name === "update_homepage") {
        try {
          if (!toolCall.function.arguments) {
            throw new Error("Function arguments are undefined");
          }
          const { updateText } = JSON.parse(toolCall.function.arguments);
          const sanitizedText = sanitizeText(updateText);

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
        } catch (parseError) {
          console.error("Error parsing function arguments:", parseError);
          res.status(500).json({ error: "Error parsing function arguments." });
        }
      } else {
        const message = openAIResponse.data.choices?.[0]?.message?.content ||
          "Could not determine the homepage update.";
        res.status(200).json({ message });
      }
    } catch (error) {
      console.error("API error:", error instanceof AxiosError ? error.response?.data : error);
      res.status(500).json({
        error: "Failed to process your request.",
        details: error instanceof AxiosError ? error.response?.data :
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);