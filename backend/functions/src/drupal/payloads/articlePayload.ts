import { UnknownRec } from "../content";
import { createMediaReference } from "../helpers/mediaHelper";

interface ArticlePayloadArgs {
  title: string;
  body?: string;
  summary?: string;
  tags?: unknown[] | unknown;
  [key: string]: unknown;
}

export const createArticlePayload = (
  basePayload: UnknownRec,
  args: ArticlePayloadArgs,
  mediaResponse?: unknown
) => {
  const tagNames = (() => {
    if (Array.isArray(args.tags)) return args.tags;
    if (args.tags !== undefined) return [args.tags];
    return [];
  })();

  const payload: UnknownRec = {
    ...basePayload,
    type: "article",
    body: {
      value: str(args.body || args.summary || "No description provided"),
      format: "basic_html",
    },
    field_summary: {
      value: str(args.summary, ""),
      format: "basic_html",
    },
    field_tags: tagNames,
  };

  // Add media if available
  if (mediaResponse) {
    console.log("Processing media response for article");
    try {
      // Use the shared helper to create the media reference
      const mediaRefs = createMediaReference(mediaResponse, str(args.title, "Article image"));

      if (mediaRefs.length > 0) {
        // If additional fields are needed, we can enhance them here
        const enhancedRef = {
          ...mediaRefs[0],
          // Add any additional fields specific to articles if needed
          ...(typeof mediaResponse === "object" && mediaResponse !== null && "uuid" in mediaResponse &&
              { target_uuid: (mediaResponse as { uuid: string }).uuid }),
          ...(typeof mediaResponse === "object" && mediaResponse !== null && "fid" in mediaResponse &&
              { target_revision_id: Number((mediaResponse as { fid: string | number }).fid) }),
          target_type: "media",
        };

        payload.field_media_image = [enhancedRef];
        console.log("Created media reference:", JSON.stringify(payload.field_media_image, null, 2));
      }
    } catch (error) {
      console.error("Error processing media response:", error);
      console.log("Raw media response:", JSON.stringify(mediaResponse, null, 2));
    }
  } else {
    console.log("No media response provided, skipping media reference");
  }

  console.log("Article payload created:", JSON.stringify(payload, null, 2));
  return payload;
};

// Helper function to safely get string values
const str = (value: unknown, defaultValue: string = ""): string =>
  typeof value === "string" ? value : defaultValue;
