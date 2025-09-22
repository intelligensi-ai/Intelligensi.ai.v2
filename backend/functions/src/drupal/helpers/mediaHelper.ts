import { MediaResponse } from "../content";

export interface MediaReference {
  target_id: number;
  alt: string;
  title: string;
  width?: number | null;
  height?: number | null;
  target_uuid?: string;
  target_type?: string;
  target_revision_id?: number;
}

/**
 * Creates a media reference object for Drupal
 * @param {MediaResponse | unknown} mediaResponse - The media response object containing media information
 * @param {string} [fallbackTitle=""] - Fallback title to use if not provided in mediaResponse
 * @return {MediaReference[]} An array containing the media reference object, or empty array if invalid
 */
export const createMediaReference = (
  mediaResponse?: MediaResponse | unknown,
  fallbackTitle: string = ""
): MediaReference[] => {
  console.log("Creating media reference with:", JSON.stringify(mediaResponse, null, 2));

  // Type guard to check if the response has the required media_id property
  const isValidMediaResponse = (
    obj: unknown
  ): obj is { media_id: string | number; alt?: string; title?: string } => {
    if (obj === null || typeof obj !== "object") {
      console.log("Media response is not an object:", obj);
      return false;
    }

    const hasMediaId = "media_id" in obj &&
      (typeof (obj as { media_id?: string | number }).media_id === "string" ||
       typeof (obj as { media_id?: string | number }).media_id === "number");

    if (!hasMediaId) {
      console.log("Media response is missing valid media_id:", obj);
    }

    return hasMediaId;
  };

  if (!isValidMediaResponse(mediaResponse)) {
    console.log("Invalid media response, returning empty array");
    return [];
  }

  const mediaRef = {
    target_id: Number(mediaResponse.media_id),
    alt: str(mediaResponse.alt || fallbackTitle, "Image"),
    title: str(mediaResponse.title || fallbackTitle, "Image"),
  };

  console.log("Created media reference:", JSON.stringify(mediaRef, null, 2));
  return [mediaRef];
};

// Helper function to safely get string values
const str = (value: unknown, defaultValue: string = ""): string =>
  typeof value === "string" ? value : defaultValue;
