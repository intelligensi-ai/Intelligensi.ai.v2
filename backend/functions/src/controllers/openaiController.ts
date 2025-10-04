import axios from "axios";
import { sanitizeText, truncateString } from "../utils/text";
import { handleMenuOperation } from "../drupal/menuService";
import type { MenuOperation } from "../drupal/menuService";
import { generateAndUploadImage } from "../services/imageService";

const DRUPAL_SITE_URL = process.env.DRUPAL_SITE_URL || "";

export interface ToolCallResult<T = unknown> {
  function: string;
  success: boolean;
  message?: string;
  type?: string;
  content?: unknown;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
  recipe?: Record<string, unknown>;
  drupalResponse?: Record<string, unknown>;
}

interface UpdateHomepageRequestBody {
  prompt: string;
  site_url?: string;
}

interface MenuOperationInput {
  action: "list_menus" | "read_menu" | "add_menu_item" | "update_menu_item" | "delete_menu_item";
  title?: string;
  url?: string;
  uuid?: string;
  weight?: number;
  parent?: string;
  expanded?: boolean;
  enabled?: boolean;
  Placeholder1?: string;
}

interface OrchestrateMenusArgs {
  menu_name?: string;
  operations: MenuOperationInput[];
}

type MediaLike = { media_id?: string } & Record<string, unknown>;

/**
 * Handle the updateHomepage flow powered by OpenAI tool calls.
 * Mirrors the behavior currently implemented in routes/openaiRoutes.ts
 * @param {UpdateHomepageRequestBody} body Incoming body with prompt and optional site_url
 * @return {Promise<{results: ToolCallResult[]}>}
 */
export async function handleUpdateHomepage(
  body: UpdateHomepageRequestBody
): Promise<{ results: ToolCallResult[] }> {
  const results: ToolCallResult[] = [];
  const { prompt, site_url: siteUrlFromClient } = body || {};
  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const systemMessage: { role: "system"; content: string } = {
    role: "system",
    content:
      "You are an assistant that ONLY responds by calling one of the provided functions. " +
      "Never reply in plain text.",
  };
  const userMessage = { role: "user" as const, content: prompt };

  const openAIResponse = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4-turbo-preview",
      messages: [systemMessage, userMessage],
      tools: [
        {
          type: "function",
          function: {
            name: "update_homepage",
            parameters: {
              type: "object",
              required: ["updateText"],
              properties: {
                updateText: {
                  type: "string",
                  description: "The text to update the homepage with.",
                },
              },
            },
            description: "Updates the homepage with the provided text.",
          },
        },
        {
          type: "function",
          function: {
            name: "create_content",
            description:
              "Creates content on the Drupal 11 site. Can handle recipes, " +
              "articles, and pages.",
            parameters: {
              type: "object",
              required: ["content_type", "title", "body"],
              properties: {
                content_type: {
                  type: "string",
                  enum: ["recipe", "article", "page"],
                  description: "The type of content to create.",
                },
                title: { type: "string" },
                body: { type: "string" },
                ingredients: { type: "array", items: { type: "string" } },
                instructions: { type: "array", items: { type: "string" } },
                cooking_time: { type: "integer" },
                prep_time: { type: "integer" },
                servings: { type: "integer" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                tags: { type: "array", items: { type: "string" } },
                image: { type: "string" },
                image_prompt: { type: "string" },
                summary: { type: "string" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "orchestrate_menus",
            description: "Manages menu operations for the Drupal site.",
            parameters: {
              type: "object",
              required: ["menu_name", "operations"],
              properties: {
                menu_name: {
                  type: "string",
                  description: "The machine name of the menu to operate on.",
                },
                operations: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["action"],
                    properties: {
                      action: {
                        type: "string",
                        enum: [
                          "list_menus",
                          "read_menu",
                          "add_menu_item",
                          "update_menu_item",
                          "delete_menu_item",
                        ],
                        description: "The menu operation to perform.",
                      },
                      title: { type: "string", description: "Title for the menu item." },
                      url: { type: "string", description: "URL for the menu item." },
                      uuid: { type: "string", description: "UUID of the menu item to update or delete." },
                      weight: { type: "number", description: "Menu item weight." },
                      parent: { type: "string", description: "Parent menu item UUID." },
                      expanded: { type: "boolean", description: "Whether the menu item is expanded." },
                      enabled: { type: "boolean", description: "Whether the menu item is enabled." },
                      Placeholder1: {
                        type: "string",
                        description: "Alternative parameter for title in add_menu_item",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_content" } },
      temperature: 0.7,
      max_tokens: 1024,
    },
    { headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" } }
  );

  const message = openAIResponse.data.choices[0]?.message;
  if (!message.tool_calls || message.tool_calls.length === 0) {
    results.push({ function: "none", success: true, message: message.content || "No response from assistant" });
    return { results };
  }

  // Process tool calls
  for (const toolCall of message.tool_calls) {
    if (!toolCall.function?.arguments) {
      throw new Error("Function arguments are undefined");
    }
    const args = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === "orchestrate_menus") {
      const opsArgs = args as OrchestrateMenusArgs;
      const opsResults: Array<{
        action: string;
        success: boolean;
        message?: string;
        data: unknown;
      }> = [];
      for (const operation of opsArgs.operations) {
        const wrappedOp: MenuOperation = {
          action: operation.action,
          parameters: {
            menu_name: opsArgs.menu_name,
            title: operation.title,
            url: operation.url,
            uuid: operation.uuid,
            weight: operation.weight,
            parent: operation.parent,
            expanded: operation.expanded,
            enabled: operation.enabled,
            Placeholder1: operation.Placeholder1,
          },
        };
        const result = await handleMenuOperation(opsArgs.menu_name || "main", wrappedOp);
        opsResults.push({
          action: operation.action,
          success: result.status === "success",
          message: result.message || "Operation completed",
          data: result,
        });
      }
      results.push({
        function: "orchestrate_menus",
        success: true,
        message: "Menu operations completed",
        data: opsResults,
      });
      continue;
    }

    if (toolCall.function.name === "update_homepage") {
      const updateText = args.text || "";
      const sanitizedText = sanitizeText(updateText);
      results.push({
        function: "update_homepage",
        success: true,
        message: `Homepage updated with: ${sanitizedText}`,
        data: args,
      });
      continue;
    }

    if (toolCall.function.name === "create_content") {
      let mediaResponse: MediaLike | null = null;

      // Build an image prompt if needed
      let imagePrompt = args.image_prompt as string | undefined;
      if (!imagePrompt && args.title) {
        switch (args.content_type) {
        case "recipe": {
          imagePrompt = [
            "Appetizing food photography of ",
            String(args.title),
            ", professional food styling, high resolution, restaurant quality",
          ].join("");
          break;
        }
        case "article": {
          imagePrompt = [
            "Editorial style image for article: ",
            String(args.title),
            ", professional photography, high resolution",
          ].join("");
          break;
        }
        case "page": {
          imagePrompt = [
            "Header image for web page: ",
            String(args.title),
            ", modern web design, high resolution",
          ].join("");
          break;
        }
        default:
          break;
        }
      }

      if (imagePrompt) {
        const siteUrlFromArgs =
          (siteUrlFromClient as string) || (args.site_url as string) || DRUPAL_SITE_URL;
        try {
          const { mediaResponse: media } = await generateAndUploadImage({
            title: args.title,
            imagePrompt,
            siteUrl: siteUrlFromArgs,
          });
          mediaResponse = (media || null) as MediaLike | null;
        } catch (error) {
          mediaResponse = {
            status: "error",
            message: error instanceof Error ? error.message : "Failed to generate/upload image",
          } as MediaLike;
        }
      }

      // Build node payload similar to existing code
      const rawSiteUrlForNode = (siteUrlFromClient as string) || (args.site_url as string) || DRUPAL_SITE_URL;
      const siteUrlForNode = (rawSiteUrlForNode || "").replace(/\/$/, "");
      const nodeUpdateEndpoint = `${siteUrlForNode}/api/node-update`;

      const basePayload = {
        title: (args.title as string) || `Untitled ${(args.content_type as string) || "content"}`,
        status: 1,
        moderation_state: "published",
        promote: 1,
        sticky: 0,
      };

      let payload: Array<Record<string, unknown>> = [];

      if (args.content_type === "recipe") {
        const recipePayload: Record<string, unknown> = {
          ...basePayload,
          type: "recipe",
          field_cooking_time: args.cooking_time || 0,
          field_preparation_time: args.prep_time || 0,
          field_ingredients: truncateString(((args.ingredients as string[] || []).join("\n")), 255),
          field_recipe_instruction: { value: (args.instructions as string[] || []).join("\n"), format: "basic_html" },
          field_number_of_servings: args.servings || 1,
          field_difficulty: args.difficulty || "medium",
          field_summary: { value: args.summary || args.body || "No summary provided", format: "basic_html" },
          ...(mediaResponse?.media_id ?
            { field_media_image: [{ target_id: mediaResponse.media_id, target_type: "media" }] } :
            {}),
        };
        payload = [recipePayload];
      } else if (args.content_type === "article") {
        const tagNames = args.tags ? (Array.isArray(args.tags) ? args.tags : [args.tags]) : [];
        const articlePayload: Record<string, unknown> = {
          ...basePayload,
          type: "article",
          field_body: [{ value: args.body || args.summary || "No description provided", format: "basic_html" }],
          field_summary: [{ value: args.summary || "", format: "basic_html" }],
          field_tags: tagNames,
          ...(mediaResponse?.media_id ?
            { field_media_image: [{ target_id: mediaResponse.media_id, target_type: "media" }] } :
            {}),
        };
        payload = [articlePayload];
      } else if (args.content_type === "page") {
        const pagePayload: Record<string, unknown> = {
          ...basePayload,
          type: "page",
          field_body: [{ value: args.body || args.summary || "No description provided", format: "basic_html" }],
          ...(mediaResponse?.media_id ?
            { field_media_image: [{ target_id: mediaResponse.media_id, target_type: "media" }] } :
            {}),
        };
        payload = [pagePayload];
      } else {
        payload = [{ ...basePayload, type: (args.content_type as string) || "page" }];
      }

      const response = await fetch(nodeUpdateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const ct = String(args.content_type || "content");
        const err = `Failed to create ${ct} via node-update. status=${response.status}`;
        const info = `url=${nodeUpdateEndpoint} payload=${JSON.stringify(payload)}`;
        throw new Error(`${err} ${info} error=${errorText}`);
      }

      const result = await response.json();
      results.push({
        function: "create_content",
        success: true,
        message: `${args.content_type || "Content"} and media created successfully`,
        drupalResponse: {
          ...(mediaResponse || {}),
          data: {
            ...(result.data ? { node: result.data as Record<string, unknown> } : {}),
          },
        },
      });
    }
  }

  return { results };
}
