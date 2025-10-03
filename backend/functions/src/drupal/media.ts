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


    // use model: "dall-e-3", for production and better quality
    const imageResp = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-2",
        prompt,
        size: "256x256", // or "512x512"
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
    // Upload the file to Firebase Storage
    await file.save(Buffer.from(imageBufferResp.data), {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          firebaseStorageDownloadTokens: "auto-generated",
        },
      },
      public: true,
    });

    // Get the public URL
    await file.getMetadata(); // Ensure metadata is updated
    const encodedPath = encodeURIComponent(fileName).replace(/%2F/g, "/");
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodedPath}?alt=media`;

    // Upload to Drupal via the uploadImage function (internal cloud function)
    const uploadHost = process.env.FUNCTIONS_EMULATOR === "true" ? "127.0.0.1:5001" : "us-central1";
    const uploadUrl =
      `http://${uploadHost}/${process.env.GCLOUD_PROJECT}/us-central1/uploadImage`;
    const uploadData = {
      imagePath: publicUrl,
      siteUrl: siteUrl || process.env.DRUPAL_SITE_URL,
      altText: title || "Generated image",
    };

    console.log("📤 Uploading to Drupal with data:", JSON.stringify(uploadData, null, 2));

    const uploadResponse = await axios.post(
      uploadUrl,
      uploadData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log("📥 Drupal upload response:", JSON.stringify(uploadResponse.data, null, 2));

    if (uploadResponse.data.status !== "success") {
      throw new Error(
        `Failed to upload image to Drupal: ${uploadResponse.data.message}`
      );
    }

    // Return the media ID and other details in the expected format
    // Note: The response contains both 'fid' and 'media_id' - we should use 'media_id'
    // as it's the actual media entity ID
    return {
      media_id: uploadResponse.data.data.media_id, // Use media_id from response
      id: uploadResponse.data.data.media_id, // Use media_id as the ID
      alt: uploadResponse.data.data.alt || title || "Generated image",
      title: title || "Generated image",
      data: {
        id: uploadResponse.data.data.media_id, // Use media_id for consistency
        alt: uploadResponse.data.data.alt || title || "Generated image",
        title: title || "Generated image",
        url: uploadResponse.data.data.url, // Include the URL from the response
        uuid: uploadResponse.data.data.uuid, // Include the UUID from the response
        media_bundle: uploadResponse.data.data.media_bundle, // Include the media bundle
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "error", message: msg };
  }
};

export { generateAndUploadImage };
