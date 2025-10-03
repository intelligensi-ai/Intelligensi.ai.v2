import { MediaResponse, ContentArgs } from "./content";
import { createArticlePayload } from "./payloads/articlePayload";
import { createPagePayload } from "./payloads/pagePayload";
import { createRecipePayload } from "./payloads/recipePayload";

const DRUPAL_SITE_URL = process.env.DRUPAL_SITE_URL || "";

/**
 * Create Drupal content via the bridge node-update endpoint.
 * @param {ContentArgs} args - The arguments for creating the content
 * @param {MediaResponse | unknown} [mediaResponse] - Optional media response data
 * @param {string} [siteUrl] - Optional base URL for the target Drupal site.
 * If omitted, falls back to DRUPAL_SITE_URL env.
 * If omitted, falls back to DRUPAL_SITE_URL env.
 * @return {Promise<{node: unknown, media: unknown}>} The created node and media
 */
export async function createDrupalContent(
  args: ContentArgs,
  mediaResponse?: MediaResponse | unknown,
  siteUrl?: string
): Promise<{ node: unknown; media: unknown }> {
  const baseUrl = (typeof siteUrl === "string" && siteUrl) ? siteUrl : DRUPAL_SITE_URL;
  if (!baseUrl) {
    throw new Error("No Drupal site URL provided. Pass siteUrl argument or set DRUPAL_SITE_URL env.");
  }
  const nodeUpdateEndpoint = `${baseUrl.replace(/\/$/, "")}/api/node-update`;
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

  const basePayload = {
    title: str(args.title, `Untitled ${str(args.content_type, "content")}`),
    status: 1,
    moderation_state: "published",
    promote: 1,
    sticky: 0,
  };

  let payload: Array<Record<string, unknown>> = [];
  const contentType = str(args.content_type);

  try {
    console.log("=== Starting Drupal Content Creation ===");
    console.log("Content Type:", contentType);
    console.log("Media Response Type:", mediaResponse ? typeof mediaResponse : "none");

    if (mediaResponse) {
      console.log("Media Response Structure:", JSON.stringify(mediaResponse, null, 2));
    }

    // Create the appropriate payload based on content type
    switch (contentType) {
    case "article":
      payload = [createArticlePayload(basePayload, args, mediaResponse)];
      break;
    case "page":
      payload = [createPagePayload(basePayload, args, mediaResponse)];
      break;
    case "recipe":
      payload = [createRecipePayload(basePayload, args, mediaResponse)];
      break;
    default:
      payload = [{ ...basePayload, type: contentType || "page" }];
      break;
    }

    console.log("=== Payload to be sent to Drupal ===");
    console.log(JSON.stringify(payload, null, 2));

    // Log the exact request being made
    console.log("=== Sending request to Drupal ===");
    console.log("Endpoint:", nodeUpdateEndpoint);
    console.log("Method: POST");

    const startTime = Date.now();
    const response = await fetch(nodeUpdateEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseTime = Date.now() - startTime;
    const responseText = await response.text();

    console.log("=== Drupal Response ===");
    console.log("Status:", response.status);
    console.log("Response Time:", `${responseTime}ms`);
    console.log("Response Headers:", JSON.stringify([...response.headers.entries()]));
    console.log("Response Body:", responseText);

    if (!response.ok) {
      console.error("=== Drupal API Error ===");
      console.error("Status:", response.status);
      console.error("Response:", responseText);
      throw new Error(`Drupal API Error: ${response.status} - ${response.statusText}`);
    }

    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
      console.log("=== Drupal Content Created Successfully ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("=== Failed to parse Drupal response ===");
      console.error("Error:", e);
      console.error("Response Text:", responseText);
      throw new Error("Failed to parse Drupal response");
    }

    return {
      node: result.data || result,
      media: mediaResponse,
    };
  } catch (error) {
    console.error("Error in createDrupalContent:", error);
    throw error;
  }
}

// Content exports are now handled in content.ts
