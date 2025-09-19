import axios from "../utils/axios";
import * as admin from "firebase-admin";

/**
 * Options for the generateAndUploadImage function
 */
interface GenerateAndUploadImageOptions {
  /** The prompt for image generation */
  prompt: string;
  /** Optional title for the image */
  title?: string;
  /** Optional site URL for upload */
  siteUrl?: string;
}

/**
 * Generates an image using OpenAI's DALL-E and uploads it to Firebase Storage,
 * then triggers a Drupal upload via a Cloud Function.
 * @param {GenerateAndUploadImageOptions} options - Configuration options
 * @return {Promise<Record<string, unknown>>} Result from the uploadImage function
 * @throws {Error} If required environment variables are missing or API calls fail
 */
// init admin lazily (caller should init in entrypoint)
/**
 * Generates an image using OpenAI's DALL-E and uploads it to Firebase Storage,
 * then triggers a Drupal upload via a Cloud Function.
 * @param {GenerateAndUploadImageOptions} options - Configuration options
 * @return {Promise<Record<string, unknown>>} Result from the uploadImage function
 * @throws {Error} If required environment variables are missing or API calls fail
 */
const generateAndUploadImage = async function(options: GenerateAndUploadImageOptions) {
  const { prompt, title, siteUrl } = options;
  // NOTE: this function keeps a similar flow to before but isolates concerns.
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const imageResp = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        n: 1,
        response_format: "url",
      },
      {
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const imageUrl = imageResp.data?.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned from OpenAI");

    // ensure admin is initialised by caller (e.g. in the route file)
    const bucketName = process.env.FIREBASE_BUCKET || "intelligensi-ai-v2.firebasestorage.app";
    const bucket = admin.storage().bucket(bucketName);
    const safeTitle = (title || "image").replace(/\s+/g, "_");
    const fileName = `generated-images/${Date.now()}-${safeTitle}.jpg`;
    const file = bucket.file(fileName);

    const imageBufferResp = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "arraybuffer",
    });
    await file.save(Buffer.from(imageBufferResp.data), {
      metadata: { contentType: "image/jpeg" },
      resumable: false,
    });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Upload to Drupal via the uploadImage function (internal cloud function)
    const uploadHost = process.env.FUNCTIONS_EMULATOR === "true" ? "127.0.0.1:5001" : "us-central1";
    const uploadUrl =
      `http://${uploadHost}/${process.env.GCLOUD_PROJECT}/us-central1/uploadImage`;
    const uploadResponse = await axios.post(
      uploadUrl,
      {
        imagePath: publicUrl,
        siteUrl: siteUrl || process.env.DRUPAL_SITE_URL,
        altText: title || "Generated image",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    return uploadResponse.data.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "error", message: msg };
  }
};

export { generateAndUploadImage };
