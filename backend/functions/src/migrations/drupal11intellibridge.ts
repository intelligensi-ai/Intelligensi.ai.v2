/**
 * Drupal 11 Bridge API
 *
 * This module provides a bridge between Firebase Functions and a Drupal 11 instance.
 * It allows for fetching content, updating nodes, and importing content into Drupal 11.
 *
 * Available Endpoints:
 *
 * 1. GET /
 *    Health check and endpoint listing
 *    Example: GET http://localhost:5001/intelligensi-ai-v2/us-central1/drupal11/
 *
 * 2. GET /structure
 *    Fetch site structure and content
 *    Query Params:
 *      - types: Content types (default: "article,page")
 *      - limit: Number of items (default: 10)
 *      - fields: Fields to include (default: "title,body,field_image")
 *    Example: GET http://localhost:5001/intelligensi-ai-v2/us-central1/drupal11/structure?types=article&limit=5
 *
 * 3. POST /node-update
 *    Update existing nodes
 *    Body: Array of node objects with 'id' and fields to update
 *    Example:
 *      POST http://localhost:5001/intelligensi-ai-v2/us-central1/drupal11/node-update
 *      Body: [{"id": 1, "type": "article", "title": "Updated Title"}]
 *
 * 4. POST /import
 *    Import new nodes
 *    Body: { nodes: [...] } - Array of node objects to create
 *    Example:
 *      POST http://localhost:5001/intelligensi-ai-v2/us-central1/drupal11/import
 *      Body: {"nodes": [{"type": "article", "title": "New Article"}]}
 *
 * Environment Variables:
 * - DRUPAL_11_BASE_URL: Base URL of the Drupal 11 instance
 */

import express, { Request, Response, RequestHandler, NextFunction } from "express";
import axios from "axios";
import * as https from "https";
import { onRequest } from "firebase-functions/v2/https";
import { getSupabase } from "../services/supabaseService";
import { uploadImageToDrupal } from "../services/imageUpload";

// Drupal 11 base URL - hardcoded as per requirements
const DRUPAL_11_BASE_URL = "https://umami-intelligensi.ai.ddev.site";

// Create an HTTPS agent that doesn't reject self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Only for development/testing with self-signed certificates
});

// Type for Drupal 11 node data (commented out since not currently used)
// interface Drupal11Node {
//   id: number;
//   type: string;
//   title: string;
//   field_body?: Array<{
//     value: string;
//     format: string;
//   }>;
//   [key: string]: unknown; // For dynamic fields
// }

// Type for import result (commented out since not currently used)
// interface ImportResult {
//   success: boolean;
//   message: string;
//   data?: unknown;
// }

// Helper to create Drupal client
const createDrupalClient = () => {
  return axios.create({
    baseURL: DRUPAL_11_BASE_URL,
    httpsAgent,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  });
};

/**
 * Drupal 11 Bridge Router
 *
 * This router handles all Drupal 11 specific API endpoints. It provides the following functionality:
 * - Content retrieval and querying
 * - Node creation and updates
 * - Schema generation and validation
 * - System health checks
 */
export const d11Router = express.Router();

// Debug route to list all available routes (development only)
d11Router.get("/debug-routes", (req: Request, res: Response) => {
  // Define a simple interface for the route information
  interface RouteInfo {
    path: string;
    methods: string[];
  }

  // Get all registered routes
  const routes: RouteInfo[] = [];

  // Type for Express router layer
  interface ExpressLayer {
    route?: {
      path: string;
      methods: { [methodName: string]: boolean };
      stack: ExpressLayer[];
    };
    name: string;
    handle: RequestHandler | ExpressLayer;
    regexp: RegExp;
    keys: { name: string | number; optional: boolean }[];
    params: Record<string, unknown>;
    method: string;
  }

  // Type assertion for the Express router instance with _router
  interface ExpressRouterWithRouter extends express.Router {
    _router: {
      stack: ExpressLayer[];
    };
  }

  (d11Router as unknown as ExpressRouterWithRouter)._router.stack.forEach((layer: ExpressLayer) => {
    if (layer.route) {
      // It's a route
      const methods = Object.keys(layer.route.methods).map((method) => method.toUpperCase());
      routes.push({
        path: layer.route.path,
        methods: methods,
      });
    } else if (layer.name === "router" && "stack" in layer.handle) {
      // It's a router mounted on a path
      (layer.handle as ExpressRouterWithRouter)._router.stack.forEach((nestedLayer: ExpressLayer) => {
        if (nestedLayer.route) {
          const methods = Object.keys(nestedLayer.route.methods).map((method) => method.toUpperCase());
          routes.push({
            path: nestedLayer.route.path,
            methods: methods,
          });
        }
      });
    }
  });

  // Send the response with all routes
  res.json({
    status: "success",
    message: "Available routes in Drupal 11 router",
    routes: routes,
    request: {
      baseUrl: req.baseUrl || "/",
      originalUrl: req.originalUrl || req.url,
      path: req.path,
      url: req.url,
      headers: req.headers,
    },
  });
});

// Apply the base path to all routes
d11Router.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`[D11] ${req.method} ${req.path}`, req.query || req.body);
  next();
});

/**
 * Upload image to Drupal
 * POST /api/image-upload
 * Body: {
 *   imagePath: string,  // URL of the image to upload
 *   siteUrl: string,    // Base URL of the Drupal site
 *   altText: string     // Alternative text for the image
 * }
 */
/**
 * Upload image to Drupal using the Drupal Bridge endpoint
 * POST /api/image-upload
 * Body: {
 *   imagePath: string,  // URL of the image to upload (can be Firebase Storage URL)
 *   siteUrl: string,    // Base URL of the Drupal site
 *   altText?: string    // Optional alternative text for the image
 * }
 */
/**
 * @api {post} /api/image-upload Upload image to Drupal
 * @apiName UploadImage
 * @apiGroup Drupal
 * @apiDescription Uploads an image to Drupal from a given URL or Firebase Storage
 *
 * @apiBody {String} imagePath URL of the image to upload (can be HTTP/HTTPS or Firebase Storage URL)
 * @apiBody {String} siteUrl Base URL of the Drupal site
 * @apiBody {String} [altText] Optional alternative text for the image
 */
d11Router.post("/api/image-upload", async (req: Request, res: Response): Promise<void> => {
  try {
    const { imagePath, siteUrl, altText = "" } = req.body;

    if (!imagePath || !siteUrl) {
      res.status(400).json({
        status: "error",
        message: "imagePath and siteUrl are required",
      });
      return;
    }

    console.log("⏳ Starting image upload process...");
    console.log("📄 Image source:", imagePath);
    console.log("🏷️ Alt text:", altText);
    console.log("🌐 Target Drupal site:", siteUrl);

    // Use the uploadImageToDrupal service to handle the upload
    const result = await uploadImageToDrupal(imagePath, siteUrl, altText);

    console.log("✅ Image uploaded successfully:", JSON.stringify(result, null, 2));
    res.json({
      status: "success",
      message: "Image uploaded successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in image upload:", error);
    res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// Error handling is now done in the individual route handlers

/**
 * Import nodes into Drupal 11
 */
// Import nodes into Drupal 11
// Import nodes to Drupal 11
d11Router.post("/import", async (req: Request, res: Response): Promise<void> => {
  const { sender_id: providedSenderId } = (req.body || {}) as { sender_id?: number };
  const incomingNodes: unknown = Array.isArray(req.body) ? req.body : (req.body?.nodes as unknown);

  if (!Array.isArray(incomingNodes) || incomingNodes.length === 0) {
    res.status(400).json({ error: "Nodes are required and must be a non-empty array" });
    return;
  }

  try {
    const client = createDrupalClient();

    type AnyRec = Record<string, unknown>;
    const valStr = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
    const boolNum = (v: unknown, d = 1): number => (typeof v === "number" ? v : d);

    // Map a flexible node input into the Drupal bridge shape (see openaiRoutes create_content)
    const mapNode = (item: AnyRec): AnyRec => {
      const type = valStr(item.type);
      const title = typeof item.title === "string" ?
        item.title :
        (item.title && typeof item.title === "object" && "value" in (item.title as AnyRec) ?
          valStr((item.title as AnyRec).value) :
          "");

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
          field_cooking_time: item.cooking_time ?? item.field_cooking_time ?? 0,
          field_preparation_time: item.prep_time ?? item.field_preparation_time ?? 0,
          field_ingredients:
            Array.isArray(item.ingredients) ?
              (item.ingredients as unknown[])
                .map(String)
                .join("\n") :
              valStr(item.field_ingredients),
          field_recipe_instruction: {
            value:
              Array.isArray(item.instructions) ?
                (item.instructions as unknown[])
                  .map(String)
                  .join("\n") :
                valStr(
                  (item as AnyRec).recipe_instructions ||
                  (item as AnyRec).field_recipe_instruction
                ),
            format: "basic_html",
          },
          field_number_of_servings: item.servings ?? item.field_number_of_servings ?? 1,
          field_difficulty: valStr(item.difficulty, "medium"),
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
              value:
                valStr((item as AnyRec).body) ||
                valStr((item as AnyRec).summary, "No description provided"),
              format: "basic_html",
            },
          ],
          field_summary: [
            { value: valStr((item as AnyRec).summary, ""), format: "basic_html" },
          ],
          field_tags: Array.isArray((item as AnyRec).tags) ? (item as { tags: unknown[] }).tags : [],
        };
      }

      // default to page
      return {
        ...base,
        type: type || "page",
        field_body: [
          {
            value:
              valStr((item as AnyRec).body) ||
              valStr((item as AnyRec).summary, "No description provided"),
            format: "basic_html",
          },
        ],
      };
    };

    const payload: AnyRec[] = (incomingNodes as AnyRec[]).map(mapNode);
    const response = await client.post("/api/node-update", payload);
    const data = response.data as { status?: string; message?: string; results?: { details?: string[] } };

    // Helper to safely get text from various field shapes
    const getText = (val: unknown): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (Array.isArray(val)) {
        // Look for first object with value or first string
        for (const item of val) {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "value" in item) {
            const v = (item as { value?: unknown }).value;
            if (typeof v === "string") return v;
          }
        }
        return "";
      }
      if (typeof val === "object") {
        const obj = val as Record<string, unknown>;
        if (typeof obj.value === "string") return obj.value;
        if (typeof obj.summary === "string") return obj.summary;
      }
      return "";
    };

    const extractTitle = (item: Record<string, unknown>): string => {
      if (typeof item.title === "string") return item.title;
      if (item.title && typeof item.title === "object" && "value" in (item.title as object)) {
        const v = (item.title as { value?: unknown }).value;
        if (typeof v === "string") return v;
      }
      if (typeof (item as { label?: string }).label === "string") return (item as { label?: string }).label!;
      return "Untitled";
    };

    const extractSnippet = (item: Record<string, unknown>): string => {
      // Preferred order: summary-like then body-like then generic
      const candidates: unknown[] = [
        (item as Record<string, unknown>).summary,
        (item as Record<string, unknown>).body,
        (item as Record<string, unknown>).field_summary,
        (item as Record<string, unknown>).field_body,
        (item as Record<string, unknown>).description,
        (item as Record<string, unknown>).excerpt,
      ];
      let text = "";
      for (const c of candidates) {
        text = getText(c);
        if (text) break;
      }
      if (!text) return "";
      const trimmed = text.trim();
      if (trimmed.length <= 25) return trimmed;
      return `${trimmed.slice(0, 25)}…`;
    };

    const normalizeArray = (resp: unknown): Record<string, unknown>[] => {
      if (Array.isArray(resp)) return resp as Record<string, unknown>[];
      if (resp && typeof resp === "object") {
        const obj = resp as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
        return [obj];
      }
      return [];
    };

    const items = normalizeArray(data);
    // If API doesn't return structured items, try to parse nids from details strings
    let detailNids: Array<{ nid: string; title?: string }> = [];
    if (data && typeof data === "object") {
      const resultsMaybe = (data as { results?: unknown }).results;
      const detailsMaybe =
        resultsMaybe && typeof resultsMaybe === "object" ?
          (resultsMaybe as { details?: unknown }).details :
          undefined;
      const detailsArr: string[] = Array.isArray(detailsMaybe) ?
        (detailsMaybe as unknown[]).map(String) :
        [];
      if (detailsArr.length) {
        const nidRegex = /Created node\s+(\d+):\s*(.+)$/i;
        detailNids = detailsArr
          .map((line) => {
            const m = nidRegex.exec(line);
            if (m) return { nid: m[1], title: m[2] };
            return { nid: "" };
          })
          .filter((x) => x.nid);
      }
    }
    const createdMessages: Array<{ nid?: number | string; inserted?: boolean; error?: string }> = [];
    const chatId = 1; // general stream
    const now = new Date().toISOString();

    // Loop through returned items and create a chat card when nid exists
    for (const item of items.length ? items : (detailNids as unknown as AnyRec[])) {
      const nid = (item as { nid?: unknown; id?: unknown }).nid ?? (item as { id?: unknown }).id;
      if (nid === undefined || nid === null) {
        continue;
      }
      const title = items.length ? extractTitle(item) : ((item as { title?: string }).title || "Untitled");
      const snippet = extractSnippet(item);
      const url = `${DRUPAL_11_BASE_URL.replace(/\/$/, "")}/node/${String(nid)}`;

      try {
        const contentPayload = {
          title,
          snippet,
          url,
          icon: "link",
        };
        const senderId = typeof providedSenderId === "number" ? providedSenderId : null;

        const insertPayload = {
          chat_id: chatId,
          sender_id: senderId,
          message_type: "card",
          content: JSON.stringify(contentPayload),
          reactions: {},
          read_by: [],
          sent_at: now,
          updated_at: now,
        } as Record<string, unknown>;

        const { error: insertError } = await getSupabase()
          .from("chat_messages")
          .insert(insertPayload);

        if (insertError) {
          console.error("[D11] Failed to insert chat card:", insertError);
          createdMessages.push({ nid: nid as number | string, inserted: false, error: insertError.message });
        } else {
          console.log("[D11] Inserted chat card for nid", nid);
          createdMessages.push({ nid: nid as number | string, inserted: true });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[D11] Exception while inserting chat card:", msg);
        createdMessages.push({ nid: nid as number | string, inserted: false, error: msg });
      }
    }

    // Return original response plus a summary of created chat cards
    res.json({
      drupal: data,
      chat_cards: createdMessages,
    });
  } catch (error) {
    console.error("Error importing nodes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Failed to import nodes",
      details: errorMessage,
    });
  }
});

// Legacy endpoints have been removed. Please use the following endpoints instead:
// - GET /structure - For content retrieval
// - POST /node-update - For updating existing nodes
// - POST /import - For creating new nodes

// Health check endpoint
d11Router.get("/hello", (_: Request, res: Response): void => {
  res.json({ message: "Drupal 11 Bridge is running" });
});

// Export the schema generation function
export { generateDrupal11Schema };

// Firebase function to generate schema from Drupal 11 site
const generateDrupal11Schema = onRequest(
  { cors: true },
  async (request, response) => {
    // Define a function to send error response
    const sendError = (status: number, message: string, details?: unknown) => {
      const errorResponse = {
        success: false,
        error: message,
        details: details || (typeof details === "string" ? details : "No details available"),
      };
      console.error(`[generateDrupal11Schema] Error (${status}):`, errorResponse);
      response.status(status).json(errorResponse);
    };

    try {
      // Only allow GET requests
      if (request.method !== "GET") {
        sendError(405, "Method Not Allowed");
        return;
      }

      console.log(`[generateDrupal11Schema] Fetching data from ${DRUPAL_11_BASE_URL}`);

      // Make request to Drupal 11 bulk export endpoint
      console.log(`[generateDrupal11Schema] Fetching data from: ${DRUPAL_11_BASE_URL}/api/bulk-export`);

      const drupalResponse = await axios.get(`${DRUPAL_11_BASE_URL}/api/bulk-export`, {
        params: {
          types: "article,page",
          limit: "1",
          _format: "json",
        },
        httpsAgent,
        headers: {
          "Accept": "application/json",
        },
        validateStatus: () => true,
      });

      console.log(`[generateDrupal11Schema] Response status: ${drupalResponse.status}`);

      if (drupalResponse.status !== 200) {
        sendError(drupalResponse.status, "Drupal API error", {
          status: drupalResponse.status,
          statusText: drupalResponse.statusText,
          data: drupalResponse.data,
        });
        return;
      }

      const responseData = drupalResponse.data;
      console.log("[generateDrupal11Schema] Response data type:", typeof responseData);

      // Handle different response formats
      let items = [];
      if (Array.isArray(responseData)) {
        items = responseData;
      } else if (responseData && typeof responseData === "object") {
        if ("data" in responseData) {
          items = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
        } else {
          items = [responseData];
        }
      } else {
        sendError(500, "Unexpected response format from Drupal API", {
          receivedType: typeof responseData,
          responseData: responseData,
        });
        return;
      }

      console.log(`[generateDrupal11Schema] Found ${items.length} items`);

      if (!items.length) {
        sendError(404, "No data received from Drupal 11 site");
        return;
      }

      try {
        // Create a simple schema based on the first item's structure
        const generateSimpleSchema = (obj: Record<string, unknown>) => {
          const schema: Record<string, string> = {};
          if (obj && typeof obj === "object") {
            Object.keys(obj).forEach((key) => {
              const value = obj[key];
              if (value === null) {
                schema[key] = "null";
              } else if (Array.isArray(value)) {
                schema[key] = "array";
              } else if (typeof value === "object") {
                schema[key] = "object";
              } else {
                schema[key] = typeof value;
              }
            });
          }
          return schema;
        };

        const schema = generateSimpleSchema(items[0]);

        // Return the schema and example data
        const result = {
          success: true,
          schema: schema,
          exampleData: items[0],
          totalItems: items.length,
        };

        console.log("[generateDrupal11Schema] Generated schema successfully");
        response.status(200).json(result);
      } catch (schemaError) {
        console.error("[generateDrupal11Schema] Schema generation error:", schemaError);
        sendError(500, "Failed to generate schema",
          schemaError instanceof Error ? schemaError.message : "Unknown schema generation error"
        );
      }
    } catch (error) {
      console.error("[generateDrupal11Schema] Unexpected error:", error);
      sendError(500, "Internal server error",
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    }
  }
);
