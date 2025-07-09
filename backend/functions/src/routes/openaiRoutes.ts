import axios, { AxiosError } from "axios";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

/**
 * Sanitize text by removing HTML tags.
 * @param {string} text - The text to sanitize.
 * @return {string} - Sanitized text.
 */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

// Define Firebase secret for OpenAI API key
const openaiSecret = defineSecret("OPENAI_API_KEY");

// Standalone Firebase Function with built-in CORS
export const updateHomepage = onRequest(
  {
    region: "us-central1",
    secrets: [openaiSecret],
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 60
  },
  async (req, res) => {
    try {
      // Handle preflight requests for CORS
      if (req.method === "OPTIONS") {
        res.status(204).send();
        return;
      }

      console.log("Received request:", {
        method: req.method,
        path: req.path,
        body: req.body,
      });

      const { prompt } = req.body || {};

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      console.log("Sending to OpenAI with prompt:", prompt);

      const systemPrompt = `You are a helpful assistant that generates content for a website homepage. 
The user will ask you to create content, and you should generate appropriate, engaging text 
that would be suitable for a professional website homepage.`;

      try {
        // Make the OpenAI API request
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Please generate content for our website homepage based on this request: "${prompt}"` },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiSecret.value()}`,
            },
          }
        );

        console.log("OpenAI Response Status:", response.status);

        // Extract the generated content
        const generatedText = response.data.choices?.[0]?.message?.content ||
          "No content generated";
        const sanitizedText = sanitizeText(generatedText);

        console.log("Generated content:", sanitizedText);

        // Send the response back to the client
        res.status(200).json({
          success: true,
          generatedText: sanitizedText,
        });
      } catch (error) {
        console.error("Error calling OpenAI API:", error);

        let errorMessage = "Failed to process your request";
        const errorDetails = error instanceof Error ? error.message : String(error);

        if (error instanceof AxiosError) {
          console.error("Axios error:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers,
          });
          errorMessage = error.response?.data?.error?.message || errorMessage;
        }

        const errorResponse: {
          error: string;
          details: string;
          stack?: string;
        } = {
          error: errorMessage,
          details: errorDetails,
        };

        if (process.env.NODE_ENV === "development" && error instanceof Error) {
          errorResponse.stack = error.stack;
        }

        res.status(500).json(errorResponse);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
