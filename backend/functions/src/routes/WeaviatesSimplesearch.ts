import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import weaviate, { ApiKey } from "weaviate-ts-client";

// Use Firebase Secret for OpenAI key; do not read env at import time
const openaiApiKey = defineSecret("OPENAI_API_KEY");


/**
 * Simple search function that queries Weaviate vector database
 * @param query - The search query string
 * @param limit - Maximum number of results to return (default: 10)
 */
export const simpleSearch = onRequest({ secrets: [openaiApiKey] }, async (req, res) => {
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
    const openaiKey = openaiApiKey.value();
    // Initialize Weaviate client with runtime secret
    const client = weaviate.client({
      scheme: "https",
      host: "o8rpm9n6tz69qo7mrhl1a.c0.europe-west3.gcp.weaviate.cloud",
      apiKey: new ApiKey("pqb7M3NvwICXPvO4Cf72knOhrplAqWNiKRy4"),
      headers: {
        "X-OpenAI-Api-Key": openaiKey,
      },
    });
    // Parse the request body if it exists
    let query;
    let prompt;

    if (req.method === "POST" && req.headers["content-type"] === "application/json") {
      // Get from request body for POST requests
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      query = body.query;
      prompt = body.prompt;
    } else {
      // Get from query parameters for GET requests
      query = req.query.query;
      prompt = req.query.prompt as string | undefined;
    }

    // Validate query parameter
    if (!query) {
      res.status(400).json({ error: "Query parameter is required" });
      return;
    }

    // Execute the search with text generation
    const result = await client.graphql
      .get()
      .withClassName("IntelligensiAi")
      .withFields(`
        title
        body
        _additional {
          generate(
            singleResult: {
              prompt: "${
  prompt ||
                `Transform this article into a captivating read about ${query}.\n` +
                "Follow this structure:\n" +
                "1. Start with a surprising fact or question to hook readers.\n" +
                "2. Simplify technical terms for a general audience.\n" +
                "3. End with an intriguing thought about future discoveries.\n\n" +
                "Title: {title}\n" +
                "Content: {body}"
}"
            }
          ) {
            singleResult
            error
          }
          certainty
        }
      `)
      .withNearText({
        concepts: [query as string],
        certainty: 0.72,
      })
      .withLimit(1)
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
