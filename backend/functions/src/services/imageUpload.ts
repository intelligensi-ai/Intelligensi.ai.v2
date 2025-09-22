import * as admin from "firebase-admin";
import FormData from "form-data";
import fetch from "node-fetch";
import path from "path";

interface ImageUploadResponse {
  status: string;
  fid: string;
  url: string;
  alt: string;
  media_id: string;
  uuid: string;
  media_bundle: string;
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const uploadImageToDrupal = async (
  filePath: string,
  siteUrl: string,
  altText = ""
): Promise<ImageUploadResponse> => {
  try {
    const formData = new FormData();
    let fileBuffer: Buffer;
    let contentType = "image/png";
    let fileName = `upload-${Date.now()}.png`;

    // Check if this is a Firebase Storage URL
    if (filePath.includes("firebasestorage.googleapis.com")) {
      console.log("🔍 Detected Firebase Storage URL");

      // Extract the file path from the URL
      const filePathDecoded = decodeURIComponent(filePath.split("/o/")[1].split("?")[0]);
      console.log("📂 Firebase file path:", filePathDecoded);

      // Get the file from Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePathDecoded);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File ${filePathDecoded} does not exist in Firebase Storage`);
      }
      // Get file metadata
      const [metadata] = await file.getMetadata();
      contentType = metadata.contentType || "image/png";
      fileName = filePathDecoded.split("/").pop() || fileName;

      // Download the file
      const [buffer] = await file.download();
      fileBuffer = Buffer.from(buffer);

      console.log(`✅ Downloaded ${fileBuffer.length} bytes from Firebase Storage`);
    } else if (filePath.startsWith("http")) {
      // Handle regular HTTP URLs
      console.log("🌐 Downloading image from URL...");
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
      }
      fileBuffer = await response.buffer();
      contentType = response.headers.get("content-type") || "image/png";
      fileName = `${Date.now()}-${path.basename(new URL(filePath).pathname) || "upload.png"}`;
    } else { // Handle local file paths (if needed)
      throw new Error("Local file paths are not supported. Please use a URL or Firebase Storage path.");
    }

    // Add file to form data
    formData.append("file", fileBuffer, {
      filename: fileName,
      contentType: contentType,
      knownLength: fileBuffer.length,
    });

    // Add alt text if provided
    if (altText) {
      formData.append("alt", altText);
    }

    // Upload to Drupal
    const uploadUrl = `${siteUrl.replace(/\/$/, "")}/api/image-upload`;
    console.log("🚀 Uploading to Drupal:", uploadUrl);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drupal upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Drupal upload successful:", JSON.stringify(result, null, 2));

    return {
      status: "success",
      fid: result.data?.fid?.toString() || "",
      url: result.data?.url || "",
      alt: altText,
      media_id: result.data?.media_id?.toString() || "",
      uuid: result.data?.uuid || "",
      media_bundle: result.data?.media_bundle || "image",
    };
  } catch (error) {
    console.error("❌ Error in uploadImageToDrupal:", error);
    throw error;
  }
};
