// index.ts
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express, { json } from "express";
import cors from "cors";
import { defineSecret } from "firebase-functions/params";
import openaiRoutes from "./routes/openaiRoutes";
import authRoutes from "./routes/authRoutes";

// Define secrets
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Set global Firebase Functions options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Initialize Express app
const app = express();
app.use(cors({ origin: true }));
app.use(json());

// Register routes
app.use("/openai", openaiRoutes);
app.use("/auth", authRoutes);

// Health check endpoint
app.get("/healthcheck", (req, res) => {
  logger.info("Health check called", { structuredData: true });
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Export the main Express app as a Firebase function
export const api = onRequest({ secrets: [openaiApiKey] }, app);
