// axios not required in this module; using global fetch

const DRUPAL_SITE_URL =
  process.env.DRUPAL_SITE_URL || "https://umami-intelligensi.ai.ddev.site";

type UnknownRec = Record<string, unknown>;

interface MediaResponse {
  media_id?: string | number;
  id?: string | number;
  alt?: string;
  title?: string;
  data?: {
    id?: string | number;
    alt?: string;
    title?: string;
  };
}

/**
 * Create Drupal content via the bridge node-update endpoint.
 * @param {Object} args - Content arguments (content_type, title, body, etc.)
 * @param {MediaResponse} [mediaResponse] - Optional media information to attach
 * @return {Promise<{node: unknown, media: unknown}>} Result payload with created node and media
 */
export async function createDrupalContent(
  args: UnknownRec,
  mediaResponse?: MediaResponse | unknown
): Promise<{ node: unknown; media: unknown }> {
  const nodeUpdateEndpoint = `${DRUPAL_SITE_URL}/api/node-update`;
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
  const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);

  const basePayload = {
    title: str(args.title, `Untitled ${str(args.content_type, "content")}`),
    status: 1,
    moderation_state: "published",
    promote: 1,
    sticky: 0,
  };

  let payload: Array<Record<string, unknown>> = [];
  const contentType = str(args.content_type);

  // Handle media attachment if provided
  const attachMedia = (payload: Record<string, unknown>): void => {
    if (!mediaResponse || typeof mediaResponse !== 'object') return;
    
    const media = mediaResponse as MediaResponse;
    const mediaImage: Record<string, unknown> = {};
    
    if (media.media_id || media.id) {
      mediaImage.target_id = media.media_id || media.id;
      mediaImage.alt = str(media.alt || media.title || args.title, "Image");
      mediaImage.title = str(media.title || media.alt || args.title, "Image");
      mediaImage.target_revision_id = media.media_id || media.id;
    } else if (media.data?.id) {
      mediaImage.target_id = media.data.id;
      mediaImage.alt = str(media.data.alt || media.data.title || args.title, "Image");
      mediaImage.title = str(media.data.title || media.data.alt || args.title, "Image");
      mediaImage.target_revision_id = media.data.id;
    }
    
    if (Object.keys(mediaImage).length > 0) {
      payload.field_media_image = mediaImage;
    }
  };

  if (contentType === "recipe") {
    const recipePayload: Record<string, unknown> = {
      ...basePayload,
      type: "recipe",
      field_cooking_time: num(args.cooking_time, 30), // Default to 30 minutes
      field_preparation_time: num(args.prep_time, 15), // Default to 15 minutes
      field_ingredients: Array.isArray(args.ingredients) 
        ? args.ingredients.join("\n") 
        : str(args.ingredients, ""),
      field_recipe_instruction: {
        value: Array.isArray(args.instructions)
          ? args.instructions.join("\n")
          : str(args.instructions, "No instructions provided"),
        format: "basic_html",
      },
      field_number_of_servings: num(args.servings, 2), // Default to 2 servings
      field_difficulty: str(args.difficulty, "medium"),
      field_summary: {
        value: str(args.summary || args.body || "No summary provided"),
        format: "basic_html",
      },
    };
    
    attachMedia(recipePayload);
    payload = [recipePayload];
  } else if (contentType === "article") {
    const tagNames = (() => {
      if (Array.isArray(args.tags)) return args.tags as unknown[];
      if (args.tags !== undefined) return [args.tags as unknown];
      return [] as unknown[];
    })();
    const articlePayload: Record<string, unknown> = {
      ...basePayload,
      type: "article",
      field_body: [
        {
          value: str(args.body) || str(args.summary) || "No description provided",
          format: "basic_html",
        },
      ],
      field_summary: [
        { value: str(args.summary, ""), format: "basic_html" },
      ],
      field_tags: tagNames,
    };
    if (mediaResponse && typeof mediaResponse === "object" &&
      "media_id" in mediaResponse) {
      (articlePayload as UnknownRec).field_media_image = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target_id: (mediaResponse as any).media_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alt: (mediaResponse as any).alt || str(args.title),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: (mediaResponse as any).alt || str(args.title),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target_revision_id: (mediaResponse as any).media_id,
      };
    }
    payload = [articlePayload];
  } else if (contentType === "page") {
    const pagePayload: Record<string, unknown> = {
      ...basePayload,
      type: "page",
      field_body: [
        {
          value: str(args.body) || str(args.summary) || "No description provided",
          format: "basic_html",
        },
      ],
    };
    if (mediaResponse && typeof mediaResponse === "object" &&
      "media_id" in mediaResponse) {
      (pagePayload as UnknownRec).field_media_image = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target_id: (mediaResponse as any).media_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alt: (mediaResponse as any).alt || str(args.title),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: (mediaResponse as any).alt || str(args.title),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target_revision_id: (mediaResponse as any).media_id,
      } as unknown;
    }
    payload = [pagePayload];
  } else {
    payload = [{ ...basePayload, type: str(args.content_type, "page") }];
  }

  const response = await fetch(nodeUpdateEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `node-update failed: ${response.status} ${errorText}`
    );
  }
  const result = await response.json();
  return { node: result.data, media: mediaResponse };
}
