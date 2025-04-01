import { Router } from "express";
import axios, { AxiosError } from "axios";
import https from "https";
import { config } from "dotenv";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

config();

// Define Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

const router = Router();

// HTTPS Agent for secure connections
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Sanitize text
const sanitizeText = (text: string): string => text.replace(/<[^>]*>?/gm, "");

// Update Homepage route
export const updateHomepage = onRequest({ secrets: [openaiApiKey] }, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

<<<<<<< HEAD
// Utility function to sanitize text
const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>?/gm, ""); // Removes HTML tags
};

// Temporarily hardcode the OpenAI API key

// Update Homepage - OpenAI Integration
router.post("/update-homepage", function(req, res) {
  const handleUpdateHomepage = async () => {
    const prompt = req.body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const openAIRequest: OpenAIRequest = {
        model: "gpt-4o",
=======
  try {
    const openAIResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
>>>>>>> 6f2b9ca (Refactor OpenAI integration in updateHomepage route; streamline request handling, improve error responses, and enhance text sanitization)
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

    // Extract function call if it exists
    const toolCall = openAIResponse.data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.name === "update_homepage") {
      try {
        if (!toolCall.function.arguments) {
          throw new Error("Function arguments are undefined");
        }
        const { updateText } = JSON.parse(toolCall.function.arguments);

        // Sanitize the text
        const sanitizedText = sanitizeText(updateText);

        // Send the sanitized text to the Drupal API
        const drupalResponse = await axios.post(
          "https://drupal7.intelligensi.online/api/update-homepage",
          { update_text: sanitizedText },
          {
            headers: { "Content-Type": "application/json" },
            httpsAgent,
          }
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
  } catch (error: unknown) {
    console.error("OpenAI API error:", error instanceof AxiosError ? error.response?.data : error);
    res.status(500).json({
      error: "Failed to process your request.",
      details: error instanceof AxiosError ? error.response?.data :
        error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
