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
import FormData from "form-data";
import fetch from "node-fetch";

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
 *   imagePath: string,  // URL of the image to upload
 *   siteUrl: string,    // Base URL of the Drupal site
 *   altText?: string    // Optional alternative text for the image
 * }
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

    // Download the image from the provided URL (e.g., Firebase Storage)
    const imageResponse = await fetch(imagePath);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from ${imagePath}: ${imageResponse.status}`);
    }
    const imageBuffer = Buffer.from(await (await imageResponse).buffer());

    // Create FormData for file upload
    const formData = new FormData();

    // Add the file to form data
    formData.append("file", imageBuffer, {
      filename: `${Date.now()}-upload.png`,
      contentType: "image/png",
      knownLength: imageBuffer.length,
    });
    formData.append("alt", altText);

    // Drupal endpoint
    const uploadImageUrl = `${siteUrl.replace(/\/$/, "")}/api/image-upload`;
    console.log("Posting image to Drupal:", uploadImageUrl);

    // Make the request with node-fetch
    const drupalResponse = await fetch(uploadImageUrl, {
      method: "POST",
      body: formData as unknown as NodeJS.ReadableStream,
      headers: formData.getHeaders(),
    });

    if (!drupalResponse.ok) {
      const errorText = await drupalResponse.text();
      throw new Error(
        `Error uploading to Drupal: ${drupalResponse.status} ${errorText}`
      );
    }

    const result = await drupalResponse.json();
    console.log("✅ Image uploaded successfully:", result);

    res.json(result);
  } catch (error: unknown) {
    console.error("Error in uploadimage endpoint:", error);
    const hasStatus = error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number";
    const errorStatus = hasStatus ?
      (error as { status: number }).status :
      500;

    res.status(errorStatus).json({
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
  const { nodes } = req.body;

  if (!nodes) {
    res.status(400).json({ error: "Nodes are required" });
    return;
  }

  try {
    const client = createDrupalClient();
    const response = await client.post("/api/node-update", { nodes });
    res.json(response.data);
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
