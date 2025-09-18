import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import axios, { isAxiosError } from "axios";

// Firebase secrets (use secrets for both to avoid CLI params requirement)
const weaviateUrlSecret = defineSecret("WEAVIATE_URL");
const weaviateApiKeySecret = defineSecret("WEAVIATE_API_KEY");

/**
 * Firebase HTTPS function to check Weaviate connection.
 */
export const checkWeaviate = onRequest(
  { secrets: [weaviateUrlSecret, weaviateApiKeySecret] },
  async function(req, res) {
    try {
      const weaviateUrl = weaviateUrlSecret.value();
      const weaviateApiKey = weaviateApiKeySecret.value();
      // Perform a simple authenticated call to verify readiness
      await axios.get(`${weaviateUrl}/v1/schema`, {
        headers: { Authorization: `Bearer ${weaviateApiKey}` },
      });
      console.log("Weaviate client ready via schema endpoint");
      res.status(200).send("Weaviate is ready.");
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Weaviate init error:", errorMsg);
      res.status(500).send("Weaviate initialization failed: " + errorMsg);
    }
  }
);

/**
 * Firebase HTTPS function to write schema to Weaviate.
 */
export const writeSchema = onRequest({ secrets: [weaviateUrlSecret, weaviateApiKeySecret] }, async (req, res) => {
  try {
    const weaviateUrl = weaviateUrlSecret.value();
    const weaviateApiKey = weaviateApiKeySecret.value();
    const classSchema = {
      class: "intelligensiAi",
      description: "Articles with OpenAI embeddings for semantic search",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": {
          model: "text-embedding-3-small",
          type: "text",
        },
      },
      properties: [
        { name: "nid", dataType: ["string"], description: "Unique node ID from Drupal" },
        { name: "title", dataType: ["text"], description: "Article title" },
        { name: "body", dataType: ["text"], description: "Main content of the article" },
        { name: "created", dataType: ["string"], description: "Creation timestamp" },
        { name: "status", dataType: ["string"], description: "Published status" },
        { name: "type", dataType: ["string"], description: "Content type" },
      ],
    };

    // Check if schema already exists
    const schemaResp = await axios.get(weaviateUrl + "/v1/schema", {
      headers: { Authorization: "Bearer " + weaviateApiKey },
    });

    const exists = (schemaResp.data.classes as { class: string }[]).some(
      function(cls) {
        return cls.class === "intelligensiAi";
      }
    );

    if (exists) {
      res.status(200).send("ℹ️ Schema already exists.");
      return;
    }

    // Create new schema
    await axios.post(weaviateUrl + "/v1/schema", classSchema, {
      headers: { Authorization: "Bearer " + weaviateApiKey },
    });

    res.status(200).send("✅ Schema created successfully for intelligensiAi class.");
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Schema creation error:", errorMsg);
    res.status(500).send("Failed to write schema: " + errorMsg);
  }
});

/**
 * Firebase HTTPS function to write data to Weaviate
 */
/**
 * Firebase HTTPS function to write data to Weaviate
 */
export const writeWeaviate = onRequest({ secrets: [weaviateUrlSecret, weaviateApiKeySecret] }, async (req, res) => {
  try {
    const weaviateUrl = weaviateUrlSecret.value();
    const weaviateApiKey = weaviateApiKeySecret.value();
    // Handle both single object and batch operations
    const inputData = req.body;
    let objectsToCreate = [];

    if (Array.isArray(inputData.objects)) {
      // Batch operation
      objectsToCreate = inputData.objects;
    } else if (inputData.class && inputData.properties) {
      // Single object operation
      objectsToCreate = [inputData];
    } else {
      throw new Error("Invalid request format. Expected either single object or batch operation");
    }

    const results = [];
    for (const obj of objectsToCreate) {
      const requestBody = {
        class: obj.class || "intelligensiAi", // Default class if not specified
        properties: obj.properties,
      };

      console.log("Sending to Weaviate:", JSON.stringify(requestBody, null, 2));

      const response = await axios.post(
        `${weaviateUrl}/v1/objects`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${weaviateApiKey}`,

          },
          timeout: 30000, // Increased timeout for vectorization
          validateStatus: () => true, // Don't throw on HTTP error status codes
        }
      );
      results.push({
        id: response.data.id,
        nid: obj.properties.nid,
        status: "created",
      });
      console.log(`✅ Created Weaviate object ${response.data.id} with nid ${obj.properties.nid}`);
    }

    res.status(200).json({
      success: true,
      message: `${results.length} object(s) successfully written to Weaviate`,
      results: results,
    });
  } catch (error) {
    console.error("❌ Weaviate write error:", error);

    if (isAxiosError(error)) {
      const errorData = error.response?.data || {};
      res.status(error.response?.status || 500).json({
        success: false,
        message: "Weaviate API error",
        error: errorData.error || error.message,
        details: errorData,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});
