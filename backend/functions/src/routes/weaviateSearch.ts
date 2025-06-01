import * as dotenv from "dotenv";
import { onRequest } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import weaviate from "weaviate-ts-client";

// Load environment variables from .env file
dotenv.config();

// Get Firebase config
const config = functions.config();

interface SearchParams {
  concepts: string[];
  prompt: string;
  certainty?: number;
  limit?: number;
}

interface SearchResult {
  title: string;
  body: string;
  generated?: string | null;
  certainty?: number;
  distance?: number;
}

interface WeaviateResultItem {
  title: string;
  body: string;
  _additional?: {
    generate?: {
      singleResult?: string;
      error?: string;
    };
    certainty?: number;
    distance?: number;
  };
}

export const generativeSearch = onRequest(async (req, res) => {
  try {
    const { concepts, prompt, certainty = 0.7, limit = 5 } = req.body as SearchParams;

    const weaviateUrl = process.env.WEAVIATE_URL;
    const weaviateApiKey = process.env.WEAVIATE_API_KEY;
    const openaiApiKeyValue = config.openai?.key;

    if (!weaviateUrl || !weaviateApiKey) {
      throw new Error("Missing required environment variables. Check WEAVIATE_URL and WEAVIATE_API_KEY");
    }

    if (!openaiApiKeyValue) {
      throw new Error(
        "Missing OpenAI API key in Firebase config. Run: firebase functions:config:set openai.key=your-key"
      );
    }

    let weaviateHost: string;
    try {
      weaviateHost = new URL(weaviateUrl).host;
    } catch (error) {
      throw new Error(`Invalid WEAVIATE_URL: ${weaviateUrl}`);
    }

    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      res.status(400).json({ error: "At least one concept is required" });
      return;
    }

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const searchQuery = concepts.join(" ");

    // ✅ Create a client with proper headers
    const client = weaviate.client({
      scheme: "https",
      host: weaviateHost,
      headers: {
        "X-Openai-Api-Key": openaiApiKeyValue,
        "Authorization": `Bearer ${weaviateApiKey}`,
      },
    });

    // ✅ Build and execute the query
    const result = await client.graphql
      .get()
      .withClassName("IntelligensiAi")
      .withFields(`
        title 
        body 
        _additional { 
          generate(singleResult: { 
            prompt: """${prompt}""", 
            apiKey: "${openaiApiKeyValue}" 
          }) { 
            singleResult 
            error 
          }
          certainty
          distance
        }
      `)
      .withNearText({
        concepts: [searchQuery],
        certainty,
      })
      .withLimit(limit)
      .do();

    // ✅ Map results
    const rawResults = result.data?.Get?.IntelligensiAi ?? [];
    const searchResults: SearchResult[] = rawResults.map((item: WeaviateResultItem) => ({
      title: item.title,
      body: item.body,
      generated: item._additional?.generate?.singleResult || null,
      certainty: item._additional?.certainty,
      distance: item._additional?.distance,
    }));

    res.status(200).json({
      success: true,
      results: searchResults,
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
