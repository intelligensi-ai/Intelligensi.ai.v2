// axios not required in this module; using global fetch

const DRUPAL_SITE_URL =
  process.env.DRUPAL_SITE_URL || "https://umami-intelligensi.ai.ddev.site";

type UnknownRec = Record<string, unknown>;

/**
 * Create Drupal content via the bridge node-update endpoint.
 * @param {Object} args - Content arguments (content_type, title, body, etc.)
 * @param {unknown} [mediaResponse] - Optional media information to attach
 * @return {Promise<{node: unknown, media: unknown}>} Result payload with created node and media
 */
export async function createDrupalContent(
  args: UnknownRec,
  mediaResponse?: unknown
): Promise<{ node: unknown; media: unknown }> {
  const nodeUpdateEndpoint = `${DRUPAL_SITE_URL}/api/node-update`;
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
  const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
  const arrStr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

  const basePayload = {
    title: str(args.title, `Untitled ${str(args.content_type, "content")}`),
    status: 1,
    moderation_state: "published",
    promote: 1,
    sticky: 0,
  };

  let payload: Array<Record<string, unknown>> = [];

  if (str(args.content_type) === "recipe") {
    payload = [
      {
        ...basePayload,
        type: "recipe",
        field_cooking_time: num(args.cooking_time),
        field_preparation_time: num(args.prep_time),
        field_ingredients: arrStr(args.ingredients).join("\n"),
        field_recipe_instruction: {
          value: arrStr(args.instructions).join("\n"),
          format: "basic_html",
        },
        field_number_of_servings: num(args.servings, 1),
        field_difficulty: str(args.difficulty, "medium"),
        field_summary: {
          value:
            str(args.summary) ||
            str(args.body) ||
            "No summary provided",
          format: "basic_html",
        },
        ...(mediaResponse && typeof mediaResponse === "object" &&
        "media_id" in mediaResponse ?
          {
            field_media_image: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              target_id: (mediaResponse as any).media_id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              alt: (mediaResponse as any).alt || str(args.title),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              title: (mediaResponse as any).alt || str(args.title),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              target_revision_id: (mediaResponse as any).media_id,
            },
          } :
          {}),
      },
    ];
  } else if (str(args.content_type) === "article") {
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
  } else if (str(args.content_type) === "page") {
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
