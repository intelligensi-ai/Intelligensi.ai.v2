import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express, { json as expressJson } from "express";
import cors from "cors";

// Existing routes from HEAD
import { updateHomepage } from "./routes/openaiRoutes";
import { fetchusers, updateuser, fetchuser } from "./routes/userRoutes";
import drupal7Router from "./migrations/drupal7Migrations";
import { d11Router } from "./migrations/drupal11intellibridge";
import { checkWeaviate, writeSchema, writeWeaviate } from "./routes/weaviateRoutes";
import { createSchema } from "./routes/schemaRoutes";
import { deleteSite } from "./routes/siteRoutes";
import { createDrupalSite } from "./routes/windsailRoutes";
import { simpleSearch } from "./routes/WeaviatesSimplesearch";
import { openaiApiKey } from "./services/openaiImageGenerator";
import { uploadImageToDrupal } from "./services/imageUpload";
import OpenAI from "openai";

// New routes/imports from ea22d36
import authRouter from "./routes/authRoutes";

// Set global options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Drupal 7 Express app
const drupal7App = express();
drupal7App.use(express.json());
drupal7App.use(cors({ origin: true }));
drupal7App.use("/", drupal7Router);

// Drupal 11 Express app
const drupal11App = express();
drupal11App.use(express.json());
drupal11App.use(cors({ origin: true }));
drupal11App.use("/", d11Router);

// Add health check endpoint for Cloud Run
drupal7App.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// Export the Express apps as Firebase Functions
export const drupal7 = onRequest({
  region: "us-central1",
  cors: true,
}, drupal7App);

// Middleware to parse JSON bodies
const jsonParser = express.json();

// Export the uploadImage function to handle image uploads to Drupal
export const uploadImage = onRequest({
  region: "us-central1",
  cors: true,
}, async (req, res) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  // Parse JSON body
  jsonParser(req, res, async () => {
    try {
    // Log the incoming request for debugging
      console.log("📥 Incoming upload request:", {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.parse(JSON.stringify(req.body)) : null,
      });

      // Check if the request has a body
      if (!req.body) {
        console.error("❌ No request body provided");
        res.status(400).json({
          status: "error",
          message: "Request body is required",
        });
        return;
      }

      const { imagePath, siteUrl, altText } = req.body;

      // Validate required fields
      if (!imagePath) {
        console.error("❌ imagePath is required");
        res.status(400).json({
          status: "error",
          message: "imagePath is required",
        });
        return;
      }

      const targetSiteUrl = siteUrl || process.env.DRUPAL_SITE_URL;
      if (!targetSiteUrl) {
        console.error("❌ siteUrl is required");
        res.status(400).json({
          status: "error",
          message: "siteUrl is required and not provided in environment variables",
        });
        return;
      }

      console.log("🚀 Starting image upload with:", {
        imagePath,
        siteUrl: targetSiteUrl,
        altText: altText || "",
      });

      // Process the upload
      const result = await uploadImageToDrupal(
        imagePath,
        targetSiteUrl,
        altText || ""
      );

      console.log("✅ Upload successful:", JSON.stringify(result, null, 2));
      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Error in uploadImage:", errorMessage, error);

      res.status(500).json({
        status: "error",
        message: `Failed to process upload: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ?
          (error instanceof Error ? error.stack : undefined) : undefined,
      });
    }

    return; // Explicit return to satisfy TypeScript
  });
});

export const drupal11 = onRequest({
  region: "us-central1",
  cors: true,
}, drupal11App);

// Auth Express app (incorporating from ea22d36)
const authApp = express();
authApp.use(cors({ origin: true }));
authApp.use(expressJson());
authApp.use("/", authRouter);
export const auth = onRequest(
  {
  },
  authApp
);

// Health check endpoint (adapted from ea22d36 as a standalone function)
export const healthcheck = onRequest((req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// HTTP endpoint for generateImage
const generateImageHttp = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (req: any, res: any) => {
    // Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Directly call the OpenAI API instead of the callable function
      const { prompt, n = 1, size = "1024x1024", response_format: responseFormat = "url" } = req.body.data || {};

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      const image = await openai.images.generate({
        model: "dall-e-2",
        prompt,
        n: Math.min(Number(n), 4), // Ensure n is a number and max 4
        size,
        response_format: responseFormat,
      });

      res.status(200).json({
        success: true,
        data: image.data,
      });
    } catch (error: unknown) {
      console.error("Error in generateImageHttp:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
        details: error && typeof error === "object" && "details" in error ?
          (error as { details: Record<string, unknown> }).details :
          {},
      });
    }
  }
);

// Export all functions
export { generateImageHttp,
  updateHomepage,
  fetchusers,
  updateuser,
  fetchuser,
  checkWeaviate,
  writeSchema,
  writeWeaviate,
  createSchema,
  deleteSite,
  createDrupalSite,
  simpleSearch,
  uploadImageToDrupal,
};

// Export ThemeCraft functions
// export const { scanWebsiteTheme, getUserThemeScans } = themeCraftFunctions;
