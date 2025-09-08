import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { storage } from "../firebase";
import FormData from "form-data";
import fetch from "node-fetch";

// Clean up any remaining temp files if needed
if (process.env.NODE_ENV === "development" || process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
// Response type is provided by Firebase Functions v2
// No need to define it explicitly

/**
 * Helper function to send consistent JSON responses
 * @param {Response} res - The response object
 * @param {number} status - HTTP status code
 * @param {unknown} data - Data to send in the response
 */
function sendResponse(
  res: { status: (code: number) => { json: (data: unknown) => void } },
  status: number,
  data: unknown
): void {
  res.status(status).json({
    success: status >= 200 && status < 300,
    data,
  });
}

// Define Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Drupal site URL
const DRUPAL_SITE_URL = "https://umami-intelligensi.ai.ddev.site";

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
  status?: string;
  fid?: string;
  media_id?: string;
  url?: string;
  alt?: string;
  uuid?: string;
  media_bundle?: string;
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
    node?: Record<string, unknown>;
  };
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  error?: {
    message: string;
    code: number;
  };
  message?: string;
  code?: number;
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
 * Sanitize text by removing HTML tags.
 * @param {string} text - The text to sanitize.
 * @return {string} - Sanitized text.
 */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

// Main function to handle the request
export const updateHomepage = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true,
  },
  async (req, res) => {
    try {
      const results: ToolCallResult[] = [];
      const responseSent = false;

      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const { prompt } = req.body || {};
      if (!prompt) {
        return sendResponse(res, 400, { error: "Prompt is required" });
      }

      const systemMessage = {
        role: "system" as const,
        content: "You are an assistant that ONLY responds by calling one of the provided functions. " +
          "Never reply in plain text.",
      };
      const userMessage = { role: "user" as const, content: prompt };

      const openAIResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
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
                    ingredients: { type: "array", items: { type: "string" } },
                    instructions: { type: "array", items: { type: "string" } },
                    cooking_time: { type: "integer" },
                    prep_time: { type: "integer" },
                    servings: { type: "integer" },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                    },
                    tags: { type: "array", items: { type: "string" } },
                    image: { type: "string" },
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
        return sendResponse(res, 200, { message: message.content || "No response from assistant" });
      }

      const toolCalls = message.tool_calls;

      try {
        for (const toolCall of toolCalls) {
          if (responseSent) break;
          if (!toolCall.function?.arguments) {
            throw new Error("Function arguments are undefined");
          }

          const args = JSON.parse(toolCall.function.arguments);

          if (toolCall.function.name === "update_homepage") {
            const updateText = args.text || "";
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

            // Function to handle media upload to Drupal
            const uploadMediaToDrupal = async (imageUrl: string, altText: string) => {
              // 1. Download image to buffer
              const imageResponse = await axios({
                method: "GET",
                url: imageUrl,
                responseType: "arraybuffer",
              });

              // 2. Upload to Firebase Storage
              const bucket = storage.bucket("intelligensi-ai-v2.firebasestorage.app");
              const fileName = `generated-images/${Date.now()}-${args.title?.replace(/\s+/g, "_") || "image"}.jpg`;
              const file = bucket.file(fileName);

              await file.save(Buffer.from(imageResponse.data), {
                metadata: { contentType: "image/jpeg" },
                resumable: false,
              });

              // Make the file publicly accessible
              await file.makePublic();
              const publicUrl = `https://storage.googleapis.com/intelligensi-ai-v2.firebasestorage.app/${fileName}`;
              console.log("Image uploaded to Firebase Storage:", publicUrl);

              // 3. Upload to Drupal
              const endpoint = `${DRUPAL_SITE_URL}/api/image-upload`;
              const drupalImageResponse = await fetch(publicUrl);
              if (!drupalImageResponse.ok) {
                throw new Error(`Failed to fetch image from ${publicUrl}: ${drupalImageResponse.status}`);
              }
              const imageBuffer = await drupalImageResponse.buffer();

              const formData = new FormData();
              formData.append("file", imageBuffer, {
                filename: `${Date.now()}-upload.jpg`,
                contentType: "image/jpeg",
                knownLength: imageBuffer.length,
              });
              formData.append("alt", altText || "Generated image");

              const drupalResponse = await fetch(endpoint, {
                method: "POST",
                body: formData as unknown as NodeJS.ReadableStream,
                headers: formData.getHeaders(),
              });

              if (!drupalResponse.ok) {
                const errorText = await drupalResponse.text();
                throw new Error(`Drupal Bridge error: ${drupalResponse.status} ${errorText}`);
              }

              return await drupalResponse.json() as DrupalResponse;
            };

            // 1. Generate image with OpenAI
            const imagePrompt = args.summary || args.body || args.title;
            console.log("Generating image with prompt:", imagePrompt);

            const openaiResponse = await axios.post(
              "https://api.openai.com/v1/images/generations",
              {
                model: "dall-e-3",
                prompt: imagePrompt,
                size: "256x256",
                n: 1,
                response_format: "url",
              },
              {
                headers: {
                  "Authorization": `Bearer ${openaiApiKey.value()}`,
                  "Content-Type": "application/json",
                },
              }
            );

            const imageUrl = openaiResponse.data.data[0].url;
            console.log("Generated image URL:", imageUrl);

            try {
              // Upload media to Drupal
              const mediaResponse = await uploadMediaToDrupal(
                imageUrl,
                args.altText || args.title || "Generated image"
              );
              console.log("✅ Uploaded via Drupal Bridge:", mediaResponse);

              const nodeUpdateEndpoint = `${DRUPAL_SITE_URL}/api/node-update`;
              const basePayload = {
                title: args.title || `Untitled ${args.content_type || "content"}`,
                body: {
                  value: args.body || args.summary || "No description provided",
                  format: "basic_html",
                },
                status: 1, // 1 = Published, 0 = Unpublished
                moderation_state: "published", // Required for content moderation
                promote: 1, // Promote to front page
                sticky: 0, // Not sticky
                field_media_image: [{
                  target_id: mediaResponse.media_id,
                  alt: args.altText || args.title || "Generated image",
                  title: args.title || `${args.content_type || "Content"} image`,
                }],
              };

              // Add content type specific fields
              let payload;
              if (args.content_type === "recipe") {
                payload = [{
                  ...basePayload,
                  type: "recipe",
                  field_cooking_time: args.cooking_time || 0,
                  field_preparation_time: args.prep_time || 0,
                  field_ingredients: (args.ingredients as string[] || []).join("\n"),
                  field_recipe_instruction: {
                    value: (args.instructions as string[] || []).join("\n"),
                    format: "basic_html",
                  },
                  field_number_of_servings: args.servings || 1,
                  field_difficulty: args.difficulty || "medium",
                  field_summary: {
                    value: args.summary || args.body || "No summary provided",
                    format: "basic_html",
                  },
                }];
              } else if (args.content_type === "article") {
                payload = [{
                  ...basePayload,
                  type: "article",
                  body: {
                    value: args.body || args.summary || "No description provided",
                    format: "basic_html",
                  },
                  field_summary: {
                    value: args.summary || "",
                    format: "basic_html",
                  },
                  field_tags: args.tags ? (Array.isArray(args.tags) ? args.tags : [args.tags]) : [],
                }];
              } else if (args.content_type === "page") {
                payload = [{
                  ...basePayload,
                  type: "page",
                  body: {
                    value: args.body || args.summary || "No description provided",
                    format: "basic_html",
                  },
                }];
              } else {
                // Default to page if content type is not recognized
                payload = [{
                  ...basePayload,
                  type: args.content_type || "page",
                }];
              }

              const response = await fetch(nodeUpdateEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `Failed to create ${args.content_type || "content"} via ` +
                  `node-update: ${response.status} ${errorText}`;
                throw new Error(errorMsg);
              }

              const result = await response.json();
              console.log(`✅ ${args.content_type || "Content"} created via node-update:`, result);

              // Combine the response data with the result
              const combinedResponse: DrupalResponse = {
                ...mediaResponse,
                data: {
                  id: mediaResponse.id || '',
                  type: mediaResponse.type || '',
                  attributes: mediaResponse.attributes || {},
                  ...(result.data && { node: result.data as Record<string, unknown> })
                }
              };

              results.push({
                function: "create_content",
                success: true,
                message: `${args.content_type || "Content"} and media created successfully`,
                drupalResponse: combinedResponse,
              });
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              console.error("Error creating Drupal node via Bridge:", errorMessage);
              return sendResponse(res, 500, {
                success: false,
                message: `Failed to create Drupal node: ${errorMessage}`,
              });
            }
          }
        }

        // Send the final response
        return sendResponse(res, 200, {
          success: true,
          message: "Operation completed successfully",
          data: results,
        });
      } catch (error) {
        console.error("Error in tool calls:", error);
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        return sendResponse(res, 500, {
          success: false,
          message: "An error occurred while processing the request",
          error: errMsg,
        });
      }
    } catch (error) {
      console.error("Unexpected error in updateHomepage:", error);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      return sendResponse(res, 500, {
        success: false,
        message: "An unexpected error occurred",
        error: errMsg,
      });
    }
  }
);
