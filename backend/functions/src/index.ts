import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express, { json as expressJson } from "express";
import cors from "cors";

// Existing routes from HEAD
import { updateHomepage } from "./routes/openaiRoutes";
import { fetchusers, updateuser, fetchuser } from "./routes/userRoutes";
import drupal7Router from "./migrations/drupal7Migrations";
import { checkWeaviate, writeSchema, writeWeaviate } from "./routes/weaviateRoutes";
import { generativeSearch } from "./routes/weaviateSearch";
import { createSchema } from "./routes/schemaRoutes";
import { deleteSite } from "./routes/siteRoutes"; // <-- Import new function
import { createDrupalSite } from "./routes/windsailRoutes";
import { simpleSearch } from "./routes/WeaviatesSimplesearch";

// New routes/imports from ea22d36
import authRouter from "./routes/authRoutes";

// Set global options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Drupal 7 Express app (from HEAD)
const drupal7App = express();
drupal7App.use("/", drupal7Router);
export const drupal7 = onRequest({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 60,
}, drupal7App);

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

// Export all other HTTPS functions (from HEAD)
export {
  updateHomepage,
  fetchusers,
  updateuser,
  fetchuser,
  checkWeaviate,
  writeSchema,
  writeWeaviate,
  generativeSearch,
  createSchema,
  deleteSite,
  createDrupalSite,
  simpleSearch,
};


