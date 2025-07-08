import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import weaviate, { ApiKey } from "weaviate-ts-client";

// Validate required environment variables
const requiredEnvVars = [
  "OPENAI_API_KEY",
  "WEAVIATE_URL",
  "WEAVIATE_API_KEY",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
}

// Parse Weaviate URL
const weaviateUrl = new URL(process.env.WEAVIATE_URL!);

// Initialize Weaviate client with environment variables
const client = weaviate.client({
  scheme: weaviateUrl.protocol.replace(":", "").replace("http", "ws"), // Convert http/https to ws/wss
  host: weaviateUrl.host,
  apiKey: new ApiKey(process.env.WEAVIATE_API_KEY!),
  headers: {
    "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY!,
  },
});

// Set global options for the function
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

/**
 * Simple search function that queries Weaviate vector database
 * @param query - The search query string
 * @param limit - Maximum number of results to return (default: 10)
 */
interface SearchResult {
  title?: string;
  body?: string;
  _additional?: {
    id?: string;
    distance?: number;
  };
}

export const simpleSearch = onRequest(async (req, res) => {
  const sendError = (status: number, message: string, details?: unknown) => {
    console.error(`Error ${status}:`, message, details);
    const errorResponse: { success: boolean; error: string; details?: unknown } = {
      success: false,
      error: message,
    };

    if (details) {
      errorResponse.details = details;
    }

    res.status(status).json(errorResponse);
  };
  // Set response headers
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Apply headers
  Object.entries(headers).forEach(([key, value]) => {
    res.set(key, value);
  });

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Skip authentication in development
    if (process.env.NODE_ENV !== "development") {
      // Verify authentication in production
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Unauthorized - Missing or invalid token" });
        return;
      }
    }

    // Parse the request body or query parameters
    let query; let limit = 5;

    // Parse query parameters
    if (req.method === "GET") {
      // For GET requests, get query params from URL
      const queryParam = req.query.query;
      if (typeof queryParam === "string") {
        query = queryParam;
      } else if (Array.isArray(queryParam) && queryParam.length > 0) {
        query = String(queryParam[0]);
      }

      const limitParam = req.query.limit;
      if (typeof limitParam === "string") {
        limit = parseInt(limitParam, 10) || limit;
      } else if (Array.isArray(limitParam) && limitParam.length > 0 && typeof limitParam[0] === "string") {
        limit = parseInt(limitParam[0], 10) || limit;
      }
    } else if (req.method === "POST") {
      // For POST requests, parse the request body
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (body && typeof body.query === "string") {
        query = body.query;
      }
      if (body && typeof body.limit === "number") {
        limit = body.limit;
      }
    }

    // Validate query parameter
    if (!query) {
      res.status(400).json({
        success: false,
        error: "Query parameter is required",
      });
      return;
    }

    console.log("Executing text search with query:", { query, limit });

    try {
      // First, try to find the correct class name by checking available classes
      const schema = await client.schema.getter().do();
      const availableClasses = schema.classes || [];
      interface WeaviateClass {
        class?: string;
        // Add other properties as needed
      }
      console.log("Available classes:", availableClasses.map((c: WeaviateClass) => c?.class || "unnamed"));

      if (availableClasses.length === 0) {
        sendError(404, "No searchable classes found in Weaviate");
        return;
      }

      // Use the first available class
      const className = availableClasses[0].class;
      if (!className) {
        sendError(500, "Invalid class name from Weaviate");
        return;
      }

      console.log(`Using class for search: ${className}`);

      // Execute a simple text-based search using the LIKE operator
      const result = await client.graphql
        .get()
        .withClassName(className)
        .withFields(`
          title
          body
          _additional {
            id
            distance
          }
        `)
        .withWhere({
          operator: "Or",
          operands: [
            {
              path: ["title"],
              operator: "Like",
              valueString: `*${query}*`,
            },
            {
              path: ["body"],
              operator: "Like",
              valueString: `*${query}*`,
            },
          ],
        })
        .withLimit(limit)
        .do();

      // Process and validate results
      const results = (result.data?.Get?.[className] || []) as SearchResult[];
      console.log("Search successful, found results:", results.length);

      // Format results with fallbacks for missing fields
      const formattedResults = results.map((item) => ({
        title: item.title || "Untitled",
        body: item.body || "No content available",
        _additional: item._additional || {},
      }));

      res.status(200).json({
        success: true,
        results: formattedResults,
        count: formattedResults.length,
      });
    } catch (error: unknown) {
      const weaviateError = error as {
        response?: {
          status: number;
          data: unknown;
          headers: Record<string, string>;
        };
        message?: string;
      };
      console.error("Weaviate search error:", weaviateError);

      // Provide more detailed error information
      if (weaviateError.response) {
        console.error("Weaviate response error:", {
          status: weaviateError.response.status,
          data: weaviateError.response.data,
          headers: weaviateError.response.headers,
        });
      }

      // If it's a 404, it means the class doesn't exist
      if (weaviateError.response?.status === 404) {
        sendError(
          404,
          "The search index is not properly set up. Please contact support.",
          "Search class not found in Weaviate"
        );
        return;
      }

      throw weaviateError;
    }
  } catch (error) {
    console.error("Search error:", error);
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
