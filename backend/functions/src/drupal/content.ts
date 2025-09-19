import { AxiosInstance } from "axios";
import { sanitizeText } from "../utils/response";

export type AnyRec = Record<string, unknown>;

export interface CreateContentOptions {
  nodes: AnyRec[];
  mediaResponse?: AnyRec;
}

/**
 * Build a Drupal content payload from a flexible input item.
 * Mirrors the mapping used by the Drupal 11 bridge for recipe/article/page.
 */
export function buildContentPayload(item: AnyRec): AnyRec {
  const valStr = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
  const boolNum = (v: unknown, d = 1): number => (typeof v === "number" ? v : d);

  const type = valStr(item.type) || "page";
  const title = typeof item.title === "string"
    ? item.title
    : (item.title && typeof item.title === "object" && "value" in (item as AnyRec)
      ? valStr((item as { title?: { value?: unknown } }).title?.value)
      : "");

  const base: AnyRec = {
    title: title || "Untitled",
    status: boolNum(item.status, 1),
    moderation_state: valStr(item.moderation_state, "published"),
    promote: boolNum(item.promote, 1),
    sticky: boolNum(item.sticky, 0),
  };

  if (type === "recipe") {
    return {
      ...base,
      type: "recipe",
      field_cooking_time: (item as AnyRec).cooking_time ?? (item as AnyRec).field_cooking_time ?? 0,
      field_preparation_time: (item as AnyRec).prep_time ?? (item as AnyRec).field_preparation_time ?? 0,
      field_ingredients: Array.isArray((item as AnyRec).ingredients)
        ? ((item as AnyRec).ingredients as unknown[]).map(String).join("\n")
        : valStr((item as AnyRec).field_ingredients),
      field_recipe_instruction: {
        value: Array.isArray((item as AnyRec).instructions)
          ? ((item as AnyRec).instructions as unknown[]).map(String).join("\n")
          : valStr((item as AnyRec).recipe_instructions || (item as AnyRec).field_recipe_instruction),
        format: "basic_html",
      },
      field_number_of_servings: (item as AnyRec).servings ?? (item as AnyRec).field_number_of_servings ?? 1,
      field_difficulty: valStr((item as AnyRec).difficulty, "medium"),
      field_summary: {
        value:
          valStr((item as AnyRec).summary) ||
          valStr((item as AnyRec).body) ||
          valStr((item as AnyRec).field_summary),
        format: "basic_html",
      },
    };
  }

  if (type === "article") {
    return {
      ...base,
      type: "article",
      field_body: [
        {
          value: valStr((item as AnyRec).body) || valStr((item as AnyRec).summary, "No description provided"),
          format: "basic_html",
        },
      ],
      field_summary: [
        { value: valStr((item as AnyRec).summary, ""), format: "basic_html" },
      ],
      field_tags: Array.isArray((item as AnyRec).tags) ? (item as { tags: unknown[] }).tags : [],
    };
  }

  // default: page
  return {
    ...base,
    type: type || "page",
    field_body: [
      {
        value: valStr((item as AnyRec).body) || valStr((item as AnyRec).summary, "No description provided"),
        format: "basic_html",
      },
    ],
  };
}

/** Merge optional media response fields into a content payload, if applicable. */
export function attachMediaToPayload(payload: AnyRec, mediaResponse?: AnyRec): AnyRec {
  if (!mediaResponse) return payload;
  // Example: if media returns an image field reference
  // Adjust this mapping based on your Drupal bridge contract
  if (mediaResponse && typeof mediaResponse === "object" && "fid" in mediaResponse) {
    return {
      ...payload,
      field_image: [{ target_id: (mediaResponse as { fid: number }).fid }],
    };
  }
  return payload;
}

/**
 * Post an array of content payloads to the Drupal bridge node-update endpoint.
 */
export async function postNodeUpdate(client: AxiosInstance, nodes: AnyRec[]) {
  const res = await client.post("/api/node-update", nodes, {
    validateStatus: () => true,
  });
  return res;
}

/**
 * High level helper to map items, optionally attach media, and post to bridge.
 */
export async function createContent(client: AxiosInstance, opts: CreateContentOptions) {
  const mapped = (opts.nodes || []).map(buildContentPayload).map((p) => attachMediaToPayload(p, opts.mediaResponse));
  const response = await postNodeUpdate(client, mapped);
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    data: response.data,
  };
}
