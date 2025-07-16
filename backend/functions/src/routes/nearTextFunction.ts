import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { logger } from "firebase-functions";

import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config(); // Load from .env locally
}

// Define secrets for production
const weaviateUrlSecret = defineSecret("WEAVIATE_URL");
const weaviateApiKeySecret = defineSecret("WEAVIATE_API_KEY");
const openaiApiKeySecret = defineSecret("OPENAI_API_KEY");

// Global function options
setGlobalOptions({
  region: "us-central1",
  secrets: [weaviateUrlSecret.name, weaviateApiKeySecret.name, openaiApiKeySecret.name],
});

export const nearTextSearch = onRequest(
  {
    secrets: [weaviateUrlSecret.name, weaviateApiKeySecret.name, openaiApiKeySecret.name],
  },
  async (req, res) => {
    const query = req.method === "GET" ? req.query.query : req.body?.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({ error: 'Query parameter "query" is required' });
      return;
    }

    // Get secrets (fallback to .env for local)
    const WEAVIATE_URL = weaviateUrlSecret.value() || process.env.WEAVIATE_URL!;
    const WEAVIATE_API_KEY = weaviateApiKeySecret.value() || process.env.WEAVIATE_API_KEY!;
    const OPENAI_API_KEY = openaiApiKeySecret.value() || process.env.OPENAI_API_KEY!;

    try {
        const client: WeaviateClient = weaviate.client({
            scheme: "https",
            host: WEAVIATE_URL.replace(/^https?:\/\//, ""),
            apiKey: new ApiKey(WEAVIATE_API_KEY),
            headers: {
              "X-OpenAI-Api-Key": OPENAI_API_KEY,
            },
            fetch, // Inject node-fetch for Node.js
          } as any);

      logger.info(`🔍 Running nearText query for: ${query}`);

      const className = "IntelligensiAi";
      logger.info(`🔍 Querying Weaviate class: ${className}`);
      
      // Using raw GraphQL query as confirmed working in Weaviate
      const response = await client.graphql
        .get()
        .withClassName(className)
        .withFields(`
          body
          nid
          _additional {
            id
            distance
          }
        `)
        .withNearText({ concepts: [query] })
        .withLimit(5)
        .do();

      const results = response.data?.Get?.[className] || [];

      res.status(200).json({
        success: true,
        count: results.length,
        results,
      });
    } catch (error: any) {
      logger.error("❌ Weaviate query failed", error);
      res.status(500).json({
        success: false,
        error: error.message || "Unknown error",
      });
    }
  }
);
