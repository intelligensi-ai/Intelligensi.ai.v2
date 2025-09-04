/**
 * OpenAI Image Generation Service
 *
 * This service provides functionality to generate images using OpenAI's DALL·E model
 * and handle the upload of generated images to Firebase Storage.
 *
 * @module openaiImageGenerator
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import fetch from "node-fetch";
import { bucket } from "../firebase"; // ✅ centralised init

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

      // Download image as buffer
      let imageBuffer: Buffer;
      if (imageData.url) {
        const response = await fetch(imageData.url);
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, "base64");
      } else {
        throw new Error("No image data returned from OpenAI.");
      }

      // Upload to Firebase Storage
      const fileName = `generatedimages/${Date.now()}-generated.png`;
      const file = bucket.file(fileName);

      await file.save(imageBuffer, {
        metadata: { contentType: "image/png" },
        resumable: false,
      });

      // Make the file publicly accessible
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      return {
        success: true,
        storagePath: fileName,
        publicUrl,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error generating or uploading image:", error);
      throw new HttpsError(
        "internal",
        "Failed to generate/upload image",
        errorMessage
      );
    }
  }
);
