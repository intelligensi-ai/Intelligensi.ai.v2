import OpenAI from "openai";
import { defineString } from "firebase-functions/params";
import fetch from "node-fetch";
import FormData from "form-data";
import type { AxiosInstance } from "axios";

const OPENAI_API_KEY = defineString("OPENAI_API_KEY");

export interface GenerateImageOptions {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
}

export interface DrupalImageUploadResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Generate an image via OpenAI Images API and return base64 payload.
 */
export async function generateImageBase64(opts: GenerateImageOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || OPENAI_API_KEY.value();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const openai = new OpenAI({ apiKey });
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    size: opts.size || "1024x1024",
    response_format: "b64_json",
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");
  return b64;
}

/**
 * Upload an image buffer to Drupal using the bridge endpoint `/api/image-upload`.
 * Content-Type is inferred from filename extension (defaults to image/png).
 */
export async function uploadImageBufferToDrupal(args: {
  buffer: Buffer;
  filename?: string;
  siteUrl: string;
  altText?: string;
}): Promise<DrupalImageUploadResult> {
  const { buffer, filename = `${Date.now()}-upload.png`, siteUrl, altText = "" } = args;

  const formData = new FormData();
  formData.append("file", buffer, {
    filename,
    contentType: filename.endsWith(".jpg") || filename.endsWith(".jpeg") ? "image/jpeg" : "image/png",
    knownLength: buffer.length,
  });
  formData.append("alt", altText);

  const uploadUrl = `${siteUrl.replace(/\/$/, "")}/api/image-upload`;
  const r = await fetch(uploadUrl, {
    method: "POST",
    body: formData as unknown as NodeJS.ReadableStream,
    headers: formData.getHeaders(),
  });

  if (!r.ok) {
    const text = await r.text();
    return { success: false, error: `Drupal upload failed: ${r.status} ${text}` };
  }
  const json = await r.json();
  return { success: true, data: json };
}

/**
 * Convenience: decode base64 image and upload to Drupal.
 */
export async function uploadBase64ImageToDrupal(args: {
  base64: string;
  siteUrl: string;
  altText?: string;
  filename?: string;
}) {
  const buffer = Buffer.from(args.base64, "base64");
  return uploadImageBufferToDrupal({ buffer, siteUrl: args.siteUrl, altText: args.altText, filename: args.filename });
}

/**
 * Optional: fetch an image by URL and upload to Drupal.
 */
export async function uploadImageUrlToDrupal(args: {
  imageUrl: string;
  siteUrl: string;
  altText?: string;
  filename?: string;
}) {
  const resp = await fetch(args.imageUrl);
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
  const buffer = Buffer.from(await (await resp).buffer());
  return uploadImageBufferToDrupal({ buffer, siteUrl: args.siteUrl, altText: args.altText, filename: args.filename });
}
