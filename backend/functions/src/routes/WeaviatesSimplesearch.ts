import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import weaviate, { ApiKey } from "weaviate-ts-client";

// Define Firebase Secrets
const openaiApiKey = defineSecret("OPENAI_API_KEY");
const weaviateUrl = defineSecret("WEAVIATE_URL");
const weaviateApiKey = defineSecret("WEAVIATE_API_KEY");

// Initialize Weaviate client
let client: ReturnType<typeof weaviate.client> | null = null;

const initializeWeaviateClient = (secrets: {
  openaiApiKey: string;
  weaviateUrl: string;
  weaviateApiKey: string;
}) => {
  try {
    const { openaiApiKey: openaiKey, weaviateUrl: url, weaviateApiKey: apiKey } = secrets;

    if (!url) {
      throw new Error("WEAVIATE_URL is not configured");
    }

    const weaviateUrlObj = new URL(url);
    
    return weaviate.client({
      scheme: weaviateUrlObj.protocol.replace(":", "").replace("http", "ws"),
      host: weaviateUrlObj.host,
      apiKey: new ApiKey(apiKey),
      headers: {
        "X-OpenAI-Api-Key": openaiKey,
      },
    });
  } catch (error) {
    logger.error("Failed to initialize Weaviate client:", error);
    throw error;
  }
};

// Set global options for the function
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// We'll initialize the client on first request
// to ensure secrets are properly loaded

interface SearchResult {
  title?: string;
  body?: string;
  _additional?: {
    id?: string;
    distance?: number;
  };
}

interface WeaviateClass {
  class?: string;
  className?: string;
}

export const simpleSearch = onRequest({
  secrets: ["OPENAI_API_KEY", "WEAVIATE_URL", "WEAVIATE_API_KEY"]
}, async (req, res) => {
  // Initialize client on first request with the latest secrets
  if (!client) {
    client = initializeWeaviateClient({
      openaiApiKey: openaiApiKey.value(),
      weaviateUrl: weaviateUrl.value(),
      weaviateApiKey: weaviateApiKey.value()
    });
  }
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.set(corsHeaders).status(204).send("");
    return;
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.set(key, value);
  });

  const sendError = (status: number, message: string, details?: unknown) => {
    logger.error(`Error ${status}:`, message, details);
    const errorResponse: { success: boolean; error: string; details?: unknown } = {
      success: false,
      error: message,
    };

    if (details) {
      errorResponse.details = details;
    }

    res.status(status).json(errorResponse);
  };

  try {
    // Initialize Weaviate client with secrets
    if (!client) {
      client = initializeWeaviateClient({
        openaiApiKey: openaiApiKey.value(),
        weaviateUrl: weaviateUrl.value(),
        weaviateApiKey: weaviateApiKey.value()
      });
    } 
    if (!client) {
        throw new Error("Failed to initialize Weaviate client");
      }

    // Parse the request
    let query: string;
    let limit = 5;

    if (req.method === "GET") {
      // For GET requests, get query params from URL
      const queryParam = req.query.query;
      if (typeof queryParam === "string") {
        query = queryParam;
      } else if (Array.isArray(queryParam) && queryParam.length > 0) {
        query = String(queryParam[0]);
      } else {
        sendError(400, "Query parameter is required");
        return;
      }

      const limitParam = req.query.limit;
      if (typeof limitParam === "string") {
        limit = parseInt(limitParam, 10) || limit;
      } else if (Array.isArray(limitParam) && limitParam.length > 0 && typeof limitParam[0] === "string") {
        limit = parseInt(limitParam[0], 10) || limit;
      }
    } else if (req.method === "POST") {
      // For POST requests, parse the request body
      let body;
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } catch (e) {
        sendError(400, "Invalid JSON body");
        return;
      }

      if (!body || typeof body.query !== "string") {
        sendError(400, "Query parameter is required in request body");
        return;
      }

      query = body.query;
      if (body.limit && typeof body.limit === "number") {
        limit = Math.min(Math.max(1, body.limit), 50); // Limit between 1 and 50
      }
    } else {
      sendError(405, "Method not allowed");
      return;
    }

    logger.info("Executing text search with query:", { query, limit });

    // Get available classes
    const schema = await client.schema.getter().do();
    const availableClasses = (schema.classes || []).map((c: WeaviateClass) => c.class || c.className || "").filter(Boolean);
    
    logger.debug("Available classes:", availableClasses);

    if (availableClasses.length === 0) {
      sendError(404, "No searchable classes found in Weaviate");
      return;
    }

    // Search across all available classes
    for (const className of availableClasses) {
      try {
        const result = await client.graphql
          .get()
          .withClassName(className)
          .withFields("title body _additional { id distance }")
          .withNearText({ concepts: [query] })
          .withLimit(limit)
          .do();

        const items = result.data.Get[className] as SearchResult[];
        
        if (items && items.length > 0) {
          const results = items
            .map((item) => ({
              id: item._additional?.id,
              title: item.title,
              body: item.body,
              distance: item._additional?.distance,
            }))
            .sort((a, b) => (a.distance || 0) - (b.distance || 0));

          logger.info(`Found ${results.length} results in class ${className}`);
          
          res.status(200).json({
            success: true,
            results,
            class: className,
          });
          return;
        }
      } catch (error) {
        logger.error(`Error searching class ${className}:`, error);
        // Continue to next class
      }
    }

    // If we get here, no results were found in any class
    res.status(200).json({
      success: true,
      results: [],
      message: "No results found"
    });
  } catch (error) {
    logger.error("Error in simpleSearch:", error);
    
    // Handle different types of errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle specific error cases
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      sendError(404, "The requested resource was not found", errorMessage);
    } else if (errorMessage.includes("connection") || errorMessage.includes("ECONN")) {
      sendError(503, "Search service is currently unavailable", errorMessage);
    } else {
      // Generic error response
      sendError(500, "Failed to perform search", errorMessage);
    }
  }
});
