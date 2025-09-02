import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

// Define the secret for OpenAI API key
export const openaiApiKey = defineSecret("OPENAI_API_KEY");

interface GenerateImageRequest {
  prompt: string;
  n?: number;
  size?: "256x256" | "512x512" | "1024x1024";
  responseFormat?: "url" | "b64_json";
}

export const generateImage = onCall(
  {
    secrets: [openaiApiKey],
    cors: true,
  },
  async (request) => {
    try {
      const { prompt, n = 1, size = "1024x1024", responseFormat = "url" } = request.data as GenerateImageRequest;

      if (!prompt) {
        throw new HttpsError("invalid-argument", "The function must be called with a prompt.");
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      const image = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n,
        size,
        response_format: responseFormat,
      });

      return {
        success: true,
        data: image.data,
      };
    } catch (error) {
      console.error("Error generating image:", error);
      throw new HttpsError("internal", "Failed to generate image", error);
    }
  });
