import * as functions from "firebase-functions";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

interface ImageUploadResponse {
  status: string;
  fid: string;
  url: string;
  alt: string;
}

export const uploadImageToDrupal = async (
  filePath: string,
  siteUrl: string,
  altText = ""
): Promise<ImageUploadResponse> => {
  try {
    const formData = new FormData();
    const isUrl = filePath.startsWith("http");
    const fileName = path.basename(filePath);

    if (isUrl) {
      // Handle remote URL
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
      }
      const buffer = await response.buffer();
      formData.append("file", buffer, {
        filename: fileName,
        contentType: response.headers.get("content-type") || "image/jpeg",
      });
    } else {
      // Handle local relative or absolute file path
      const absolutePath = path.resolve(filePath); // normalize
      console.log("Resolved file path:", absolutePath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }

      const fileStream = fs.createReadStream(absolutePath);
      formData.append("file", fileStream, {
        filename: fileName,
        contentType: "image/jpeg", // Default to jpeg
      });
    }

    formData.append("alt", altText);

    // Make the request to Drupal
    const baseUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    const response = await fetch(`${baseUrl}/api/image-upload`, {
      method: "POST",
      headers: formData.getHeaders(),
      body: formData as unknown as NodeJS.ReadableStream,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drupal upload failed: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as ImageUploadResponse;
  } catch (error) {
    console.error("Error uploading image to Drupal:", error);
    throw error;
  }
};

// Firebase HTTP function for uploading images
export const uploadImage = functions.https.onRequest(async (req, res) => {
  try {
    const { imagePath, siteUrl, altText = "" } = req.body;

    if (!imagePath || !siteUrl) {
      res.status(400).json({
        status: "error",
        message: "Both imagePath and siteUrl are required",
      });
      return;
    }

    console.log(`Attempting to upload image from: ${imagePath} to ${siteUrl}`);
    const result = await uploadImageToDrupal(imagePath, siteUrl, altText);
    console.log("Upload successful:", result);

    res.json({
      status: "success",
      message: "Image uploaded successfully",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Upload failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails =
      error instanceof Error ? error.toString() : String(error);

    res.status(500).json({
      status: "error",
      message: errorMessage,
      details: errorDetails,
    });
  }
});
