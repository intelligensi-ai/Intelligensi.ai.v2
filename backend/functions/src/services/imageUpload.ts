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
    console.log(
      `Attempting to upload image from: ${filePath} to ${siteUrl}`
    );
    const formData = new FormData();
    let fileBuffer: Buffer;
    let contentType = "image/png";
    let fileName = `upload-${Date.now()}.png`;

    // Support gs:// URLs
    if (filePath.startsWith("gs://")) {
      const noScheme = filePath.replace(/^gs:\/\//, "");
      const firstSlash = noScheme.indexOf("/");
      const bucketName = firstSlash === -1 ? noScheme : noScheme.slice(0, firstSlash);
      const objectPath = firstSlash === -1 ? "" : noScheme.slice(firstSlash + 1);

      if (!objectPath) {
        throw new Error(`Invalid gs URL, missing object path: ${filePath}`);
      }

      const bucket = admin.storage().bucket(bucketName);
      const file = bucket.file(objectPath);

      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File ${objectPath} does not exist in bucket ${bucketName}`);
      }

      const [metadata] = await file.getMetadata();
      contentType = metadata.contentType || "image/png";
      fileName = objectPath.split("/").pop() || fileName;

      const [buffer] = await file.download();
      fileBuffer = Buffer.from(buffer);
      console.log(`✅ Downloaded ${fileBuffer.length} bytes from gs://${bucketName}/${objectPath}`);

    // Check if this is a Firebase Storage URL (web endpoint)
    } else if (
      filePath.includes("firebasestorage.googleapis.com") ||
      filePath.includes("storage.googleapis.com")
    ) {
      console.log("🔍 Detected Firebase Storage URL");

      // Handle both formats:
      // 1) https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<object>?...
      // 2) https://storage.googleapis.com/<bucket>/<object>
      let bucketName = "";
      let objectPath = "";
      try {
        const url = new URL(filePath);
        if (url.hostname === "firebasestorage.googleapis.com") {
          // /v0/b/<bucket>/o/<object>
          const parts = url.pathname.split("/").filter(Boolean); // ["v0","b","<bucket>","o", "<object>..."]
          const bucketIdx = parts.indexOf("b");
          const objectIdx = parts.indexOf("o");
          if (bucketIdx !== -1 && bucketIdx + 1 < parts.length) {
            bucketName = parts[bucketIdx + 1];
          }
          if (objectIdx !== -1 && objectIdx + 1 < parts.length) {
            objectPath = decodeURIComponent(parts.slice(objectIdx + 1).join("/"));
          }
        } else {
          // storage.googleapis.com/<bucket>/<object>
          const parts = url.pathname.split("/").filter(Boolean);
          bucketName = parts.shift() || "";
          objectPath = decodeURIComponent(parts.join("/"));
        }
      } catch (e) {
        // Fallback: try legacy split for firebasestorage URL
        if (filePath.includes("/o/")) {
          const afterO = filePath.split("/o/")[1] || "";
          objectPath = decodeURIComponent(afterO.split("?")[0] || "");
        }
      }

      if (!objectPath) {
        throw new Error(`Could not parse Firebase Storage object path from URL: ${filePath}`);
      }

      const bucket = admin.storage().bucket(bucketName || undefined);
      const file = bucket.file(objectPath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File ${objectPath} does not exist in Firebase Storage`);
      }
      // Get file metadata
      const [metadata] = await file.getMetadata();
      contentType = metadata.contentType || "image/png";
      fileName = objectPath.split("/").pop() || fileName;

      // Download the file
      const [buffer] = await file.download();
      fileBuffer = Buffer.from(buffer);
      console.log(`✅ Downloaded ${fileBuffer.length} bytes from Firebase Storage URL: ${filePath}`);
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

    // Some Drupal endpoints return fields at top-level, others under data.*
    const fid = (result?.data?.fid ?? result?.fid)?.toString?.() || "";
    const mediaId = (result?.data?.media_id ?? result?.media_id)?.toString?.() || "";
    const urlOut = (result?.data?.url ?? result?.url) || "";
    const uuidOut = (result?.data?.uuid ?? result?.uuid) || "";
    const bundle = (result?.data?.media_bundle ?? result?.media_bundle) || "image";

    return {
      status: "success",
      fid,
      url: urlOut,
      alt: altText,
      media_id: mediaId,
      uuid: uuidOut,
      media_bundle: bundle,
    };
  } catch (error) {
    console.error("❌ Error in uploadImageToDrupal:", error);
    throw error;
  }
};
