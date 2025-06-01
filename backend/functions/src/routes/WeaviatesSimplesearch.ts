import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import weaviate, { ApiKey } from "weaviate-ts-client";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

// Initialize Weaviate client with environment variables
const client = weaviate.client({
  scheme: "https",
  host: "o8rpm9n6tz69qo7mrhl1a.c0.europe-west3.gcp.weaviate.cloud",
  apiKey: new ApiKey("pqb7M3NvwICXPvO4Cf72knOhrplAqWNiKRy4"),
  headers: {
    "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY as string
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
export const simpleSearch = onRequest(async (req, res) => {
  // Set response headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  try {
    // Parse the request body if it exists
    let query, limit;
    
    if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
      // Get from request body for POST requests
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      query = body.query;
      limit = body.limit || 10;
    } else {
      // Get from query parameters for GET requests
      query = req.query.query;
      limit = req.query.limit || 10;
    }

    // Validate query parameter
    if (!query) {
      res.status(400).json({ error: "Query parameter is required" });
      return;
    }

    // Execute the search
    const result = await client.graphql
      .get()
      .withClassName("IntelligensiAi")
      .withFields(`
        _additional {
          certainty
        }
        title
        body
        nid
      `)
      .withNearText({
        concepts: ["can you find a poem"]
      })
      .withLimit(Number(limit))
      .do();

    // Send results
    res.status(200).json({
      success: true,
      results: result.data?.Get?.IntelligensiAi || [],
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform search",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
