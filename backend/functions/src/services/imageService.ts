import axios from "axios";
import * as admin from "firebase-admin";

export interface GenerateUploadParams {
  title?: string;
  imagePrompt: string;
  siteUrl: string;
}

export interface GenerateUploadResult {
  storagePublicUrl: string;
  mediaResponse: unknown | null;
}

/**
 * Generate an image with OpenAI, upload to Firebase Storage, then upload to Drupal via uploadImage function.
 * @param {GenerateUploadParams} params Parameters including imagePrompt and siteUrl
 * @return {Promise<GenerateUploadResult>} Public URL and Drupal media response
 */
export async function generateAndUploadImage(params: GenerateUploadParams): Promise<GenerateUploadResult> {
  const { title, imagePrompt, siteUrl } = params;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // 1) Generate image via OpenAI
  const imageResponse = await axios.post(
    "https://api.openai.com/v1/images/generations",
    {
      model: "dall-e-2",
      prompt: imagePrompt,
      size: "256x256",
      n: 1,
      response_format: "url",
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const imageUrl: string | undefined = imageResponse.data?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("OpenAI did not return an image URL");
  }

  // 2) Upload to Firebase Storage
  const bucket = admin.storage().bucket();
  const safeTitle = (title || "image").replace(/\s+/g, "_");
  const fileName = `generated-images/${Date.now()}-${safeTitle}.jpg`;
  const file = bucket.file(fileName);

  const imageResponseBuffer = await axios.get(imageUrl, { responseType: "arraybuffer" });
  await file.save(Buffer.from(imageResponseBuffer.data), {
    metadata: { contentType: "image/jpeg" },
    resumable: false,
  });

  await file.makePublic();
  const storagePublicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  // 3) Upload to Drupal using our HTTP function
  const uploadFunctionUrl = process.env.FUNCTIONS_EMULATOR === "true" ?
    `http://127.0.0.1:5001/${process.env.GCLOUD_PROJECT}/us-central1/uploadImage` :
    `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/uploadImage`;

  const uploadResponse = await axios.post(
    uploadFunctionUrl,
    {
      imagePath: storagePublicUrl,
      siteUrl,
      altText: title || "Generated content image",
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return {
    storagePublicUrl,
    mediaResponse: uploadResponse.data?.data ?? null,
  };
}
