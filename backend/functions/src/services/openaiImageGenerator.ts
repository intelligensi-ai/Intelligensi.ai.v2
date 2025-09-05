import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import fetch from "node-fetch";
import { bucket } from "../firebase";

export const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const generateAndUploadToDrupal = onCall(
  { secrets: [openaiApiKey], cors: true },
  async (request) => {
    try {
      const { prompt, siteUrl, altText } = request.data;

      if (!prompt || !siteUrl || !altText) {
        throw new HttpsError(
          "invalid-argument",
          "Must include prompt, siteUrl, and altText"
        );
      }

      const openai = new OpenAI({ apiKey: openaiApiKey.value() });

      // 1️⃣ Generate Image
      const image = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });

      if (!image.data?.[0]?.url) {
        throw new Error("No image returned from OpenAI.");
      }

      // 2️⃣ Download and save to Firebase
      const response = await fetch(image.data[0].url);
      const buffer = Buffer.from(await response.arrayBuffer());

      const fileName = `generated-images/${Date.now()}-generated.png`;
      const file = bucket.file(fileName);

      await file.save(buffer, {
        metadata: { contentType: "image/png" },
        resumable: false,
      });

      // Public URL 
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // 3️⃣ Call your uploadImage Firebase function
      const uploadResponse = await fetch(
        `http://localhost:5001/${process.env.GCLOUD_PROJECT}/us-central1/uploadImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePath: publicUrl,
            siteUrl,
            altText,
          }),
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(
          `uploadImage failed: ${uploadResponse.status} ${await uploadResponse.text()}`
        );
      }

      const uploadResult = await uploadResponse.json();

      return {
        success: true,
        generatedUrl: publicUrl,
        drupalResult: uploadResult,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ generateAndUploadToDrupal error:", err);
      throw new HttpsError("internal", msg);
    }
  }
);
