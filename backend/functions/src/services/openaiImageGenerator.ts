/**
 * OpenAI Image Generation Service
 * 
 * This service provides functionality to generate images using OpenAI's DALL·E model
 * and handle the upload of generated images to a Drupal site.
 * 
 * @module openaiImageGenerator
 * @example
 * // Example usage in a Firebase Callable Function:
 * const response = await generateImage({
 *   prompt: "A futuristic cityscape at sunset",
 *   n: 1, // Optional: Number of images to generate (default: 1)
 *   size: "1024x1024", // Optional: Image size (default: "1024x1024")
 *   responseFormat: "url" // Optional: Response format ("url" or "b64_json")
 * });
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import FormData from "form-data";
import { httpClient } from "../utils/httpClient"; // Use your custom Axios instance

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
      const { prompt, n = 1, size = "1024x1024", responseFormat = "url" } =
        request.data as GenerateImageRequest;

      if (!prompt) {
        throw new HttpsError(
          "invalid-argument",
          "The function must be called with a prompt."
        );
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      // Generate image from DALL·E
      const image = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n,
        size,
        response_format: responseFormat,
      });

      if (!image.data || image.data.length === 0) {
        throw new Error("No image data returned from OpenAI.");
      }

      const imageData: { url?: string; b64_json?: string } = image.data[0]!;

      // Download image as buffer if URL provided
      let imageBuffer: Buffer;
      if (imageData.url) {
        const response = await fetch(imageData.url);
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, "base64");
      } else {
        throw new Error("No image data returned from OpenAI.");
      }

      // Prepare upload to Drupal using httpClient
      const formData = new FormData();
      formData.append("file", imageBuffer, {
        filename: "generated.png",
        contentType: "image/png",
      });

      formData.append("alt", prompt);

      const drupalResponse = await httpClient.post(
        "/api/image-upload", // Relative path, httpClient handles baseURL
        formData,
        { headers: formData.getHeaders() }
      );

      return {
        success: true,
        drupalFile: drupalResponse.data,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error generating or uploading image:", error);
      throw new HttpsError(
        "internal",
        "Failed to generate/upload image",
        errorMessage
      );
    }
  }
);
