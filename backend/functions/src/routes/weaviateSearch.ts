import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import weaviate from "weaviate-ts-client";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}
if (!process.env.WEAVIATE_URL) {
  throw new Error("WEAVIATE_URL environment variable is not set");
}
if (!process.env.WEAVIATE_API_KEY) {
  throw new Error("WEAVIATE_API_KEY environment variable is not set");
}

// CORS headers configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-OpenAI-Api-Key",
  "Content-Type": "application/json",
};

// Initialize Weaviate client with environment variables
const client = weaviate.client({
  scheme: "https",
  host: process.env.WEAVIATE_URL.replace(/^https?:\/\//, ""),
  apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
  headers: {
    "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY,
  },
});

// Set global options for the function
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

/**
 * Simple search function that queries Weaviate vector database
 */
export const simpleSearch = onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.set(corsHeaders).status(204).send("");
    return;
  }

  // Set CORS headers for the response
  res.set(corsHeaders);

  try {
    let query: string;
    let userPrompt: string;
    let certainty: number;

    // Parse request based on method
    if (req.method === "POST" && req.headers["content-type"]?.includes("application/json")) {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      query = body.query || "";
      userPrompt = body.prompt || "";
      certainty = parseFloat(body.certainty) || 0.72;
    } else if (req.method === "GET") {
      query = (req.query.query as string) || "";
      userPrompt = (req.query.prompt as string) || "";
      certainty = parseFloat(req.query.certainty as string) || 0.72;
    } else {
      res.status(400).json({
        success: false,
        error: "Invalid request method. Use GET with query parameters or POST with JSON body.",
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        error: "Query parameter is required",
      });
      return;
    }

    console.log(`Searching for: ${query} with prompt: ${userPrompt} and certainty: ${certainty}`);

    // Perform the search using the Weaviate client's GraphQL API
    const result = await client.graphql
      .get()
      .withClassName("IntelligensiAi")
      .withNearText({
        concepts: [query],
        certainty: certainty,
      })
      .withGenerate({
        singlePrompt: userPrompt || "Make this content more engaging: {content}",
      })
      .withFields("title body _additional { generate { singleResult error } certainty }")
      .withLimit(1)
      .do();

    // Return the search results
    res.status(200).json({
      success: true,
      results: result.data?.Get?.IntelligensiAi || [],
    });
  } catch (error: unknown) {
    console.error("Search error:", error);

    // More detailed error handling
    const errorResponse: {
      success: boolean;
      error: string;
      details?: string;
      response?: unknown;
    } = {
      success: false,
      error: "Failed to perform search",
      details: error instanceof Error ? error.message : String(error),
    };

    if ((error as { response?: { data?: unknown } })?.response?.data) {
      errorResponse.response = (error as { response: { data: unknown } }).response.data;
    }

    res.status(500).json(errorResponse);
  }
});
