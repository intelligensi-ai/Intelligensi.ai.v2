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

import express, { Request, Response, NextFunction } from "express";
import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import https from "https";
import { onRequest } from "firebase-functions/v2/https";

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

// Handle Axios errors consistently
const handleAxiosError = (error: unknown, context: string) => {
  if (isAxiosError(error)) {
    console.error(`Axios error in ${context}:`, error.message);
    if (error.response) {
      return {
        status: error.response.status,
        error: `Error in ${context}`,
        details: error.response.data || error.message,
      };
    }
  } else if (error instanceof Error) {
    console.error(`Error in ${context}:`, error.message);
  }

  return {
    status: 500,
    error: `Unexpected error in ${context}`,
    details: error instanceof Error ? error.message : "Unknown error",
  };
};

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
const d11Router = express.Router();

// Debug route to list all available routes (development only)
d11Router.get("/debug-routes", (req: Request, res: Response) => {
  interface RouteInfo {
    path: string;
    methods: { [method: string]: boolean };
  }

  const routes: RouteInfo[] = [];

  // Type assertion for accessing private _router property
  const routerStack = (d11Router as unknown as { _router: { stack: unknown[] } })._router.stack;

  routerStack.forEach((middleware: unknown) => {
    if (middleware && typeof middleware === "object" && "route" in middleware) {
      // Routes registered directly on the router
      const mw = middleware as { route: { path: string; methods: { [method: string]: boolean } } };
      routes.push({ path: mw.route.path, methods: mw.route.methods });
    } else if (
      middleware &&
      typeof middleware === "object" &&
      "name" in middleware &&
      middleware.name === "router" &&
      "handle" in middleware &&
      typeof middleware.handle === "object" &&
      middleware.handle !== null &&
      "stack" in middleware.handle &&
      Array.isArray(middleware.handle.stack)
    ) {
      // Nested routers
      interface RouteHandler {
        route?: {
          path: string;
          methods: { [method: string]: boolean };
        };
      }
      interface NestedRouter {
        handle: {
          stack: RouteHandler[];
        };
      }
      const nestedRouter = middleware as NestedRouter;
      nestedRouter.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({ path: handler.route.path, methods: handler.route.methods });
        }
      });
    }
  });

  res.json({
    message: "Registered routes in drupal11Router",
    routes: routes.map((r) => ({
      path: r.path,
      methods: Object.keys(r.methods).filter((m) => r.methods[m]),
    })),
  });
});

// Debug route to list all available routes
d11Router.get("/debug-routes", (req, res) => {
  // Define interfaces for Express layer and route objects
  interface ExpressRoute {
    path: string;
    methods: { [method: string]: boolean };
    stack: unknown[];
  }

  interface ExpressLayer {
    name: string;
    regexp: RegExp;
    keys: Array<{ name: string | number }>;
    route?: ExpressRoute;
  }

  // First, log all layers in the router stack for debugging
  console.log("[D11 Debug] Router stack layers:");
  (d11Router.stack as unknown as ExpressLayer[]).forEach((layer, index) => {
    console.log(`[${index}]`, {
      name: layer.name,
      path: layer.route?.path,
      methods: layer.route?.methods ? Object.keys(layer.route.methods) : "middleware",
      regexp: layer.regexp?.toString(),
      keys: layer.keys,
    });
  });

  // Also include all methods for each path
  const routesByPath = new Map<string, string[]>();
  (d11Router.stack as unknown as ExpressLayer[]).forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      const existing = routesByPath.get(layer.route.path) || [];
      routesByPath.set(layer.route.path, [...new Set([...existing, ...methods])]);
    }
  });

  const routesWithMethods = Array.from(routesByPath.entries()).map(([path, methods]) => ({
    path,
    methods: methods.sort(),
  }));

  res.json({
    message: "Available routes in Drupal 11 router",
    routes: routesWithMethods,
    baseUrl: req.baseUrl || "/",
    originalUrl: req.originalUrl || req.url,
    path: req.path,
    url: req.url,
    headers: req.headers,
    routerStack: (d11Router.stack as unknown as ExpressLayer[]).map((layer) => ({
      name: layer.name,
      path: layer.route?.path,
      methods: layer.route?.methods ?
        Object.keys(layer.route.methods) :
        "middleware",
      regexp: layer.regexp?.toString(),
      keys: layer.keys,
    })),
  });
});

// Apply the base path to all routes
d11Router.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`[D11] ${req.method} ${req.path}`, req.query || req.body);
  next();
});

// Root path handler
/**
 * Simple hello world endpoint
 */
d11Router.get("/", (req: Request, res: Response) => {
  console.log("[D11] Root path accessed");
  res.json({
    message: "Drupal 11 Bridge API is running",
    basePath: "/",
    availableEndpoints: [
      "/hello - Health check endpoint",
      "/transmit - Forward to structure endpoint",
      "/structure - Get site structure",
      "/info - Get site information",
      "/export - Export nodes",
      "/update - Update nodes",
    ],
  });
});

/**
 * Structure endpoint - fetches content from Drupal 11
 * This endpoint uses the Drupal 11 bulk export API to fetch content.
 *
 * @param req - Express request object with query params: types, limit, fields
 * @param res - Express response object
 */
d11Router.get("/structure", async (req: Request, res: Response): Promise<void> => {
  const { types = "article,page", limit = "10", fields = "title,body,field_image" } = req.query;

  const fullEndpoint = `${DRUPAL_11_BASE_URL}/api/bulk-export`;
  const params = new URLSearchParams({
    types: types as string,
    limit: limit as string,
    fields: fields as string,
  });

  const config: AxiosRequestConfig = {
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    httpsAgent,
  };

  try {
    const response = await axios.get(`${fullEndpoint}?${params.toString()}`, config);
    res.json({ structure: response.data });
  } catch (error) {
    console.error("Error in /structure:", error);
    const status = isAxiosError(error) ? error.response?.status || 500 : 500;
    res.status(status).json({
      error: "Failed to fetch site structure",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

interface SiteInfo {
  name: string;
  slogan: string;
  email: string;
  status: boolean;
}

/**
 * Get site information from Drupal 11
 * @param req - Express request object
 * @param res - Express response object
 */
d11Router.get("/info", async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(`${DRUPAL_11_BASE_URL}/api/bulk-export?types=page&limit=1`, {
      httpsAgent,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      const siteInfo: SiteInfo = {
        name: "Drupal 11 Site",
        slogan: "Powered by Drupal 11",
        email: "admin@example.com",
        status: true,
      };
      res.json(siteInfo);
      return;
    } else {
      res.status(404).json({
        error: "Failed to fetch site info",
        details: "No data returned from Drupal 11 API",
      });
      return;
    }
  } catch (error) {
    console.error("Error in /info:", error);
    const status = isAxiosError(error) ? error.response?.status || 500 : 500;
    res.status(status).json({
      error: "Failed to fetch site info",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

/**
 * Update homepage in Drupal 11 using Intelligensi Bridge
 */
d11Router.post("/homepage", async (req: Request, res: Response): Promise<void> => {
  const { nid, siteUrl } = req.body;

  if (!nid) {
    res.status(400).json({ error: "Node ID (nid) is required" });
    return;
  }

  if (!siteUrl) {
    res.status(400).json({ error: "Site URL is required" });
    return;
  }

  try {
    const response = await axios.post(
      `${siteUrl}/intelligensi-bridge/update-homepage`,
      { nid: Number(nid) },
      {
        httpsAgent,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );

    res.json({
      success: true,
      message: "Homepage updated successfully",
      data: response.data,
      source: siteUrl,
    });
    return;
  } catch (error) {
    console.error("Error in /homepage:", error);
    const status = isAxiosError(error) ? error.response?.status || 500 : 500;
    res.status(status).json({
      error: "Failed to update homepage",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

/**
 * Update nodes in Drupal 11 via the node-update endpoint
 * This matches the curl command:
 * curl -X POST https://umami-intelligensi.ai.ddev.site/api/node-update \
 *   -H "Content-Type: application/json" \
 *   -d '[{"id":19,"type":"page",...}]'
 */
d11Router.post("/node-update", async (req: Request, res: Response): Promise<void> => {
  console.log("[D11] POST Export/Update endpoint accessed");

  const nodes = req.body;

  if (!nodes || !Array.isArray(nodes)) {
    res.status(400).json({ error: "Request body must be an array of nodes" });
    return;
  }

  const fullEndpoint = `${DRUPAL_11_BASE_URL}/api/node-update`;

  const config: AxiosRequestConfig = {
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    httpsAgent,
  };

  try {
    console.log(`[D11] Making POST request to Drupal 11 API: ${fullEndpoint}`);
    console.log(`[D11] Updating ${nodes.length} nodes`);

    const response = await axios.post(fullEndpoint, nodes, config);

    // Return the response from Drupal
    res.json(response.data);
  } catch (error) {
    console.error("[D11] Error in POST export/update endpoint:", error);
    const errorMessage = handleAxiosError(error, "updating nodes in Drupal 11");
    res.status(500).json({
      success: false,
      error: "Failed to update nodes in Drupal 11",
      details: errorMessage,
    });
  }
});


/**
 * Import nodes to Drupal 11 using Intelligensi Bridge
 *
 * Example cURL command:
 * curl -X POST https://umami-intelligensi.ai.ddev.site/api/import-nodes \
 *   -H "Content-Type: application/json" \
 *   -d '[{"id":19,"type":"page","title":"Test Update","field_body":[{"value":"<p>test</p>","format":"basic_html"}]}]'
 */
d11Router.post("/import", async (req: Request, res: Response): Promise<void> => {
  const { nodes } = req.body;

  if (!nodes || !Array.isArray(nodes)) {
    res.status(400).json({ error: "Nodes array is required" });
    return;
  }

  try {
    // Create a client with the hardcoded URL and no authentication
    const client = createDrupalClient();

    // Log the import request
    console.log(`[D11] Importing ${nodes.length} nodes`);
    console.log(`[D11] First node ID: ${nodes[0]?.id || "N/A"}`);

    // Make the request to Drupal's import-nodes endpoint
    const response = await client.post("/api/node-update", { nodes });

    // Log successful import
    console.log(`[D11] Import successful. Status: ${response.status}`);

    // Return the response data
    res.json({
      success: true,
      status: response.status,
      data: response.data,
    });
  } catch (error) {
    console.error("[D11] Import error:", error);
    const errorResponse = handleAxiosError(error, "import");
    res.status(errorResponse.status).json({
      success: false,
      error: errorResponse.error,
      details: errorResponse.details,
    });
  }
});

/**
 * Bulk export nodes from Drupal 11
 */
d11Router.get("/structure", async (req: Request, res: Response): Promise<void> => {
  try {
    // Hardcoded endpoint for testing
    const hardcodedEndpoint = "https://umami-intelligensi.ai.ddev.site/api/bulk-export";

    // Create client with the hardcoded endpoint as base URL
    const client = axios.create({
      baseURL: hardcodedEndpoint,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: () => true, // Don't throw for any status
    });

    // Make the request to the Drupal 11 site
    const drupalResponse = await client.get(
      "/api/bulk-export",
      {
        params: req.query,
        validateStatus: () => true, // Don't throw on HTTP error status codes
      }
    );

    // Handle the response
    if (drupalResponse.status === 200) {
      // If we have data and this is not a partial export, try to create a schema
      if (
        drupalResponse.data &&
        Array.isArray(drupalResponse.data) &&
        drupalResponse.data.length > 0 &&
        !req.query.limit
      ) {
        try {
          const { createSchema } = await import("../routes/schemaRoutes");

          // Create a mock request object
          const mockReq = {
            body: { structure: [drupalResponse.data[0]] },
            method: "POST",
            headers: { "content-type": "application/json" },
            query: {},
            params: {},
          } as unknown as Request; // Type assertion for Express Request

          // Create a mock response object
          const mockRes = {
            status: (code: number) => ({
              json: (result: unknown) => {
                console.log("Schema creation result:", result);
                return {
                  status: code,
                  data: result,
                };
              },
            }),
          } as unknown as Response; // Type assertion for Express Response

          // Call createSchema with mock request and response objects
          // @ts-expect-error - Ignore type checking for dynamic import
          await createSchema(mockReq, mockRes);
        } catch (schemaError) {
          console.error("Error creating schema:", schemaError);
          // Continue with the export even if schema creation fails
        }
      }

      // Return the Drupal response data
      res.json({
        status: "success",
        data: drupalResponse.data,
        source: hardcodedEndpoint,
      });
      return;
    }

    // If we get here, the request failed
    throw new Error(`Drupal API returned status ${drupalResponse.status}`);
  } catch (error) {
    console.error("Error fetching site structure:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = {
      error: "Failed to fetch site structure",
      details: errorMessage,
    };

    if (isAxiosError(error)) {
      console.error("Request failed:", error.message);
      Object.assign(errorResponse, {
        axiosError: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        },
      });
    }

    res.status(500).json(errorResponse);
    return;
  }
});

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

// Export the router and the function
export { d11Router, generateDrupal11Schema };

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
