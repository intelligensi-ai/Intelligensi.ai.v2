import axios from "axios";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { Response } from "firebase-functions/v1";

// Define Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Define types for better type safety
interface Recipe {
  title: string;
  body: string;
  ingredients: string[];
  instructions: string[];
  cooking_time: number;
  servings: number;
  difficulty?: "easy" | "medium" | "hard";
}

interface DrupalResponse {
  data?: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  error?: {
    message: string;
    code: number;
  };
}

interface ToolCallResult<T = unknown> {
  function: string;
  success: boolean;
  message?: string;
  type?: string;
  content?: unknown;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
  recipe?: Recipe;
  drupalResponse?: DrupalResponse;
}

/**
 * Sends an HTTP response with the specified status code and data
 * @param {Response} res - The response object
 * @param {number} status - The HTTP status code
 * @param {unknown} data - The data to send in the response
 */
const sendResponse = (res: Response, status: number, data: unknown): void => {
  res.status(status).json(data);
};

/**
 * Sanitize text by removing HTML tags.
 * @param {string} text - The text to sanitize.
 * @return {string} - Sanitized text.
 */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

// ... rest of the handler code
export const updateHomepage = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true,
  },
  async (req, res) => {
    let responseSent = false;
    /**
     * Sends a single response and ensures no further responses are sent
     * @param {number} status - The HTTP status code
     * @param {unknown} data - The data to send in the response
     */
    function sendSingleResponse(status: number, data: unknown): void {
      if (responseSent) return;
      responseSent = true;
      sendResponse(res, status, data);
    }

    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const { prompt } = req.body || {};
      if (!prompt) {
        sendSingleResponse(400, { error: "Prompt is required" });
        return;
      }

      const requestData = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an assistant that ONLY responds by calling " +
              "one of the provided functions. Never reply in plain text.",
          },
          { role: "user", content: prompt },
        ],
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
              description: "Creates content on the Drupal 11 site. Can handle recipes, articles, and pages.",
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
                  ingredients: {
                    type: "array",
                    items: { type: "string" },
                  },
                  instructions: {
                    type: "array",
                    items: { type: "string" },
                  },
                  cooking_time: { type: "integer" },
                  prep_time: { type: "integer" },
                  servings: { type: "integer" },
                  difficulty: {
                    type: "string",
                    enum: ["easy", "medium", "hard"],
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                  image: { type: "string" },
                },
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "create_content" },
        },
        temperature: 0.7,
        max_tokens: 1024,
      };

      const headers = {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        requestData,
        { headers }
      );

      const message = response.data.choices[0]?.message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        sendSingleResponse(200, {
          message: message.content || "No response from assistant",
        });
        return;
      }

      const toolCalls = message.tool_calls;
      const results: ToolCallResult[] = [];

      for (const toolCall of toolCalls) {
        if (responseSent) break;
        if (!toolCall.function?.arguments) {
          throw new Error("Function arguments are undefined");
        }

        const args = JSON.parse(toolCall.function.arguments) as {
          updateText?: string;
          content_type?: string;
          title?: string;
          body?: string;
          summary?: string;
          ingredients?: string[];
          instructions?: string[];
          cooking_time?: number;
          prep_time?: number;
          servings?: number;
          difficulty?: string;
          tags?: string[];
          image?: string;
        };

        if (toolCall.function.name === "update_homepage") {
          const updateText = args.updateText || "";
          const sanitizedText = sanitizeText(updateText);
          console.log("update_homepage called with args:", args);
          results.push({
            function: "update_homepage",
            success: true,
            message: `Homepage updated with: ${sanitizedText}`,
            data: args,
          });
        } else if (toolCall.function.name === "create_content") {
          console.log("create_content called with args:", args);

          // Prepare recipe-specific data if content_type is recipe
          let node: Record<string, unknown>[];
          if (args.content_type === "recipe") {
            const summary = args.summary || (args.body ? args.body.substring(0, 200) + "..." : "No summary");
            const ingredients = (args.ingredients || []).filter(Boolean).map((v: string) => ({ value: v }));
            const instructions = (args.instructions || []).filter(Boolean).map((step: string) => ({ value: step }));

            // Initialize node as an array of objects for recipe content type
            node = [
              {
                type: "recipe",
                title: args.title,
                body: { value: args.body, format: "full_html" },
                status: 1,
                moderation_state: "published",
                field_summary: summary,
                field_ingredients: ingredients,
                field_instructions: instructions.map((i: { value: string }) => i.value).join("\n"),
                field_cooking_time: args.cooking_time,
                field_prep_time: args.prep_time,
                field_servings: args.servings,
                field_difficulty: args.difficulty,
                field_recipe_category: "Recipes",
              },
            ];
          } else {
            // Default case for other content types
            node = [
              {
                type: args.content_type,
                title: args.title,
                body: { value: args.body, format: "full_html" },
                status: 1,
                moderation_state: "published",
                field_tags: (args.tags || []).map((t: string) => ({ value: t })),
                field_image: args.image ? { uri: args.image } : undefined,
              },
            ];
          }

          const drupalResponse = await axios.post(
            `https://drupal11.intelligensi.online/jsonapi/node/${String(args.content_type)}`,
            node,
            {
              headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
              },
            }
          );

          console.log(
            "Drupal response:",
            JSON.stringify(drupalResponse.data, null, 2)
          );

          results.push({
            function: "create_content",
            success: true,
            message: `Content "${args.title}" created successfully`,
            type: args.content_type,
            content: args,
            drupalResponse: drupalResponse.data,
          });
        }
      }

      // If we get here, we've successfully processed the request
      if (!responseSent) {
        sendSingleResponse(200, { results });
      }
    } catch (error) {
      console.error("Error in updateHomepage:", error);
      if (!responseSent) {
        sendSingleResponse(500, { error: "Internal server error" });
      }
    }
  }
);
