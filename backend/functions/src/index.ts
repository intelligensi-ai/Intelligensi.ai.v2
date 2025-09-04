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
import { uploadImage } from "./services/imageUpload";
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
        model: "dall-e-3",
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
  uploadImage,
};

// Export ThemeCraft functions
// export const { scanWebsiteTheme, getUserThemeScans } = themeCraftFunctions;
