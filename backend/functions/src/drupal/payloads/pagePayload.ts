import { UnknownRec } from "../content";
import { createMediaReference } from "../helpers/mediaHelper";

interface PagePayloadArgs {
  title: string;
  body?: string;
  summary?: string;
  [key: string]: unknown;
}

export const createPagePayload = (
  basePayload: UnknownRec,
  args: PagePayloadArgs,
  mediaResponse?: unknown
) => {
  const payload: UnknownRec = {
    ...basePayload,
    type: "page",
    body: [
      {
        value: str(args.body || args.summary || "No description provided"),
        format: "basic_html",
      },
    ],
  };

  // Add media if available
  if (mediaResponse) {
    payload.field_media_image = createMediaReference(
      mediaResponse,
      str(args.title)
    );
  }

  console.log("Page payload created:", JSON.stringify(payload, null, 2));
  return payload;
};

// Helper function to safely get string values
const str = (value: unknown, defaultValue: string = ""): string =>
  typeof value === "string" ? value : defaultValue;
