import { UnknownRec } from "../content";
import { createMediaReference } from "../helpers/mediaHelper";

interface RecipePayloadArgs {
  title: string;
  body?: string;
  summary?: string;
  ingredients?: string[] | string;
  instructions?: string;
  servings?: number;
  difficulty?: string;
  [key: string]: unknown;
}

export const createRecipePayload = (
  basePayload: UnknownRec,
  args: RecipePayloadArgs,
  mediaResponse?: unknown
) => {
  const ingredients = Array.isArray(args.ingredients) ?
    args.ingredients :
    args.ingredients ?
      [args.ingredients] :
      [];

  const payload: UnknownRec = {
    ...basePayload,
    type: "recipe",
    field_ingredients: ingredients,
    field_instructions: {
      value: str(args.instructions || args.body || "No instructions provided"),
      format: "basic_html",
    },
    field_number_of_servings: Number(args.servings) || 2,
    field_difficulty: str(args.difficulty, "medium"),
    field_summary: {
      value: str(args.summary || args.body || "No summary provided"),
      format: "basic_html",
    },
  };

  // Add media if available
  if (mediaResponse) {
    payload.field_media_image = createMediaReference(
      mediaResponse,
      str(args.title)
    );
  }

  console.log("Recipe payload created:", JSON.stringify(payload, null, 2));
  return payload;
};

// Helper function to safely get string values
const str = (value: unknown, defaultValue: string = ""): string =>
  typeof value === "string" ? value : defaultValue;
