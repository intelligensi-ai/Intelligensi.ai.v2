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

// Export all functions
export {
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
};

// Export ThemeCraft functions
// export const { scanWebsiteTheme, getUserThemeScans } = themeCraftFunctions;


