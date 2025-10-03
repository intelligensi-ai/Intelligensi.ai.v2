import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";
// import { defineSecret } from "firebase-functions/params";  // Unused import
import * as https from "https";
import * as admin from "firebase-admin";

// Constants
const STORAGE_BUCKET = "intelligensi-ai-v2.firebasestorage.app";

// Configure axios to ignore SSL errors in development
if (process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  // Configure axios instance to use the custom agent
  axios.defaults.httpsAgent = httpsAgent;

  // Extend RequestInit to include agent property
  interface ExtendedRequestInit extends RequestInit {
    agent?: https.Agent;
  }

  // Override global fetch to use the custom agent
  const originalFetch = global.fetch;
  global.fetch = (input: RequestInfo | URL, init: ExtendedRequestInit = {}) => {
    const options: ExtendedRequestInit = { ...init };
    if (!options.agent) {
      options.agent = httpsAgent;
    }
    return originalFetch(input, options);
  };
}

// Drupal site configuration (must be provided via args.site_url or environment)
const DRUPAL_SITE_URL = process.env.DRUPAL_SITE_URL || "";
const DRUPAL_API_USERNAME = process.env.DRUPAL_API_USERNAME || "";
const DRUPAL_API_PASSWORD = process.env.DRUPAL_API_PASSWORD || "";

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
  menu_name?: string;
  items?: MenuItem[];
  menus?: Menu[];
  count?: number;
}

interface MenuItem {
  uuid: string;
  title: string;
  url: string;
  route_name: string;
  route_parameters: Record<string, string>;
  weight: number;
  expanded: boolean;
  enabled: boolean;
  children: MenuItem[];
}

interface Menu {
  id: string;
  label: string;
  description: string;
  locked: boolean;
  count: number;
}

interface MenuOperation {
  action: "list_menus" | "read_menu" | "add_menu_item" | "update_menu_item" | "delete_menu_item";
  parameters: {
    menu_name?: string;
    title?: string;
    url?: string;
    uuid?: string;
    weight?: number;
    parent?: string;
    expanded?: boolean;
    enabled?: boolean;
    Placeholder1?: string;
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

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: STORAGE_BUCKET, // Forces the right bucket
    });
  } catch {
    // ignore
  }
}

/**
 * Sends a JSON response with the given status code and data
 * @param {Object} res - The response object
 * @param {number} status - The HTTP status code
 * @param {any} data - The data to send in the response
 * @return {void}
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

/**
 * Sanitizes text by removing HTML tags
 * @param {string} text - The text to sanitize
 * @return {string} The sanitized text
 */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

// Truncate a string to a maximum length
function truncateString(text: string, max: number): string {
  if (typeof text !== "string") return "";
  return text.length > max ? text.slice(0, max) : text;
}

/**
 * Handles menu operations for the Drupal site
 * @param {string} menuName - The name of the menu to operate on
 * @param {MenuOperation} operation - The operation to perform
 * @return {Promise<DrupalResponse>} The result of the operation
 */
async function handleMenuOperation(menuName: string, operation: MenuOperation): Promise<DrupalResponse> {
  const { action, parameters } = operation;
  const baseUrl = `${DRUPAL_SITE_URL}/api/menu`;

  try {
    const auth = {
      username: DRUPAL_API_USERNAME,
      password: DRUPAL_API_PASSWORD,
    };

    switch (action) {
    case "list_menus": {
      const listResponse = await axios.get(`${baseUrl}/list`, { auth });
      return listResponse.data;
    }

    case "add_menu_item": {
      const title = parameters.Placeholder1 || parameters.title || "New Menu Item";
      const addResponse = await axios.post(
        `${baseUrl}/main`,
        {
          operation: "add",
          title: title,
          url: parameters.url || `internal:${title.toLowerCase().replace(/\s+/g, "-")}`,
          weight: parameters.weight || 0,
          parent: parameters.parent || "",
          expanded: parameters.expanded || false,
          enabled: parameters.enabled !== false,
        },
        { auth }
      );
      return addResponse.data;
    }

    case "read_menu": {
      const readResponse = await axios.get(`${baseUrl}/${parameters.menu_name || menuName}`, { auth });
      return readResponse.data;
    }

    case "update_menu_item": {
      if (!parameters.uuid) {
        throw new Error("UUID is required for updating a menu item");
      }
      const updateResponse = await axios.post(
        `${baseUrl}/${menuName}`,
        {
          operation: "update",
          uuid: parameters.uuid,
          ...(parameters.title && { title: parameters.title }),
          ...(parameters.url && { url: parameters.url }),
          ...(parameters.weight !== undefined && { weight: parameters.weight }),
          ...(parameters.parent !== undefined && { parent: parameters.parent }),
          ...(parameters.expanded !== undefined && { expanded: parameters.expanded }),
          ...(parameters.enabled !== undefined && { enabled: parameters.enabled }),
        },
        { auth }
      );
      return updateResponse.data;
    }

    case "delete_menu_item": {
      if (!parameters.uuid) {
        throw new Error("UUID is required for deleting a menu item");
      }
      const deleteResponse = await axios.post(
        `${baseUrl}/${menuName}`,
        {
          operation: "delete",
          uuid: parameters.uuid,
        },
        { auth }
      );
      return deleteResponse.data;
    }

    default:
      throw new Error(`Unsupported menu operation: ${action}`);
    }
  } catch (error) {
    console.error("Menu operation failed:", error);
    throw error;
  }
}

// Main function to handle the request
export const updateHomepage = onRequest(
  {
    secrets: ["OPENAI_API_KEY"],
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

      const { prompt, site_url: siteUrlFromClient } = req.body || {};
      if (!prompt) {
        return sendResponse(res, 400, { error: "Prompt is required" });
      }

      const systemMessage = {
        role: "system" as const,
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
                            enum: ["list_menus", "read_menu", "add_menu_item", "update_menu_item", "delete_menu_item"],
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
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
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

          if (toolCall.function.name === "orchestrate_menus") {
            try {
              const results = [];
              for (const operation of args.operations) {
                const result = await handleMenuOperation(args.menu_name || "main", operation);
                results.push({
                  action: operation.action,
                  success: result.status === "success",
                  message: result.message || "Operation completed",
                  data: result,
                });
              }
              return sendResponse(res, 200, { results });
            } catch (error) {
              console.error("Error processing menu operations:", error);
              return sendResponse(res, 500, {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                details: error instanceof Error ? error.stack : undefined,
              });
            }
          }

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

            let mediaResponse: DrupalResponse | null = null;

            try {
              // Generate and upload image if prompt is provided or if content type supports it
              let imagePrompt = args.image_prompt;
              if (!imagePrompt && args.title) {
                switch (args.content_type) {
                case "recipe": {
                  const base = "Appetizing food photography of ";
                  const details = ", professional food styling, high resolution, restaurant quality";
                  imagePrompt = `${base}${args.title}${details}`;
                  break;
                }
                case "article": {
                  const base = "Editorial style image for article: ";
                  const details = ", professional photography, high resolution";
                  imagePrompt = `${base}${args.title}${details}`;
                  break;
                }
                case "page": {
                  const base = "Header image for web page: ";
                  const details = ", modern web design, high resolution";
                  imagePrompt = `${base}${args.title}${details}`;
                  break;
                }
                default:
                  break;
                }
              }

              if (imagePrompt) {
                console.log("🖼️  Generating image with prompt:", imagePrompt);

                try {
                  // 1. Generate image with OpenAI
                  const imageResponse = await axios.post(
                    "https://api.openai.com/v1/images/generations",
                    {
                      model: "dall-e-3",
                      prompt: imagePrompt,
                      size: "1024x1024",
                      n: 1,
                      response_format: "url",
                    },
                    {
                      headers: {
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );

                  const imageUrl = imageResponse.data.data[0].url;
                  console.log("✅ Generated image URL:", imageUrl);

                  // 2. Upload to Firebase Storage
                  const bucket = admin.storage().bucket(STORAGE_BUCKET);
                  const safeTitle = args.title?.replace(/\s+/g, "_") || "image";
                  const fileName = `generated-images/${Date.now()}-${safeTitle}.jpg`;
                  const file = bucket.file(fileName);

                  // Download the image
                  const imageResponseBuffer = await axios({
                    method: "GET",
                    url: imageUrl,
                    responseType: "arraybuffer",
                  });

                  // Upload to Firebase Storage
                  await file.save(Buffer.from(imageResponseBuffer.data), {
                    metadata: { contentType: "image/jpeg" },
                    resumable: false,
                  });

                  // Make the file publicly accessible
                  await file.makePublic();
                  // Always use the public GCS URL as the imagePath we send to the uploader
                  const storagePublicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                  console.log("✅ Image uploaded to Firebase Storage:", storagePublicUrl);

                  // 3. Upload to Drupal via our uploadImage function
                  const uploadFunctionUrl = process.env.FUNCTIONS_EMULATOR === "true"
                    ? `http://127.0.0.1:5001/${process.env.GCLOUD_PROJECT}/us-central1/uploadImage`
                    : `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/uploadImage`;

                  const siteUrlFromArgs = (siteUrlFromClient as string) || (args.site_url as string) || DRUPAL_SITE_URL;
                  const uploadResponse = await axios.post(
                    uploadFunctionUrl,
                    {
                      imagePath: storagePublicUrl,
                      siteUrl: siteUrlFromArgs,
                      altText: args.title || "Generated content image",
                    },
                    {
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );

                  mediaResponse = uploadResponse.data.data;
                  console.log("✅ Media uploaded to Drupal:", mediaResponse);
                } catch (error) {
                  console.error("Error generating/uploading image:", error);
                  // Continue without failing the entire request
                  mediaResponse = {
                    status: "error",
                    message: error instanceof Error ? error.message : "Failed to generate/upload image",
                  };
                }
              }

              const rawSiteUrlForNode = (siteUrlFromClient as string) || (args.site_url as string) || DRUPAL_SITE_URL;
              const siteUrlForNode = (rawSiteUrlForNode || "").replace(/\/$/, "");
              const nodeUpdateEndpoint = `${siteUrlForNode}/api/node-update`;
              type BasePayload = {
                title: string;
                status: number;
                moderation_state: string;
                promote: number;
                sticky: number;
              };

              const basePayload: BasePayload = {
                title: args.title || `Untitled ${args.content_type || "content"}`,
                status: 1, // 1 = Published, 0 = Unpublished
                moderation_state: "published", // Content moderation
                promote: 1, // Promote to front page
                sticky: 0, // Not sticky
              };

              let payload: Array<Record<string, unknown>>;

              if (args.content_type === "recipe") {
                // Prepare recipe payload
                const recipePayload: Record<string, unknown> = {
                  ...basePayload,
                  type: "recipe",
                  field_cooking_time: args.cooking_time || 0,
                  field_preparation_time: args.prep_time || 0,
                  // Prevent DB truncation errors on Drupal column field_ingredients_value
                  field_ingredients: truncateString(((args.ingredients as string[] || []).join("\n")), 255),
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
                  ...(mediaResponse?.media_id ? {
                    // field_media_image is a Media reference; pass Media entity id
                    field_media_image: [
                      {
                        target_id: mediaResponse.media_id,
                        target_type: "media",
                      },
                    ],
                  } : {}),
                };

                payload = [recipePayload];
              } else if (args.content_type === "article") {
                const tagNames = args.tags ?
                  (Array.isArray(args.tags) ? args.tags : [args.tags]) :
                  [];

                const articlePayload: Record<string, unknown> = {
                  ...basePayload,
                  type: "article",
                  field_body: [
                    {
                      value: args.body || args.summary || "No description provided",
                      format: "basic_html",
                    },
                  ],
                  field_summary: [
                    {
                      value: args.summary || "",
                      format: "basic_html",
                    },
                  ],
                  field_tags: tagNames,
                };

                if (mediaResponse?.media_id) {
                  (articlePayload as Record<string, unknown>).field_media_image = [
                    {
                      target_id: mediaResponse.media_id,
                      target_type: "media",
                    },
                  ] as unknown as Record<string, unknown>;
                }

                payload = [articlePayload];
              } else if (args.content_type === "page") {
                const pagePayload: Record<string, unknown> = {
                  ...basePayload,
                  type: "page",
                  field_body: [
                    {
                      value: args.body || args.summary || "No description provided",
                      format: "basic_html",
                    },
                  ],
                };

                if (mediaResponse?.media_id) {
                  (pagePayload as Record<string, unknown>).field_media_image = [
                    {
                      target_id: mediaResponse.media_id,
                      target_type: "media",
                    },
                  ] as unknown as Record<string, unknown>;
                }

                payload = [pagePayload];
              } else {
                payload = [
                  {
                    ...basePayload,
                    type: args.content_type || "page",
                  },
                ];
              }

              const authHeader = (DRUPAL_API_USERNAME && DRUPAL_API_PASSWORD)
                ? `Basic ${Buffer.from(`${DRUPAL_API_USERNAME}:${DRUPAL_API_PASSWORD}`).toString("base64")}`
                : undefined;

              const response = await fetch(nodeUpdateEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authHeader ? { Authorization: authHeader } : {}),
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `Failed to create ${args.content_type || "content"} via node-update. ` +
                  `status=${response.status} url=${nodeUpdateEndpoint} payload=${JSON.stringify(payload)} ` +
                  `error=${errorText}`;
                throw new Error(errorMsg);
              }

              const result = await response.json();
              const contentType = args.content_type || "Content";
              console.log(
                `✅ ${contentType} created via node-update:`,
                result
              );

              // Combine the response data with the result
              const combinedResponse: DrupalResponse = {
                ...(mediaResponse || {}),
                data: {
                  id: mediaResponse?.id || "",
                  type: mediaResponse?.type || "",
                  attributes: mediaResponse?.attributes || {},
                  ...(result.data && { node: result.data as Record<string, unknown> }),
                },
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
