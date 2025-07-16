import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";

// Import route handlers
import { updateHomepage } from "./routes/openaiRoutes";
import { fetchusers, updateuser, fetchuser } from "./routes/userRoutes";
import drupal7Router from "./migrations/drupal7Migrations";
import { drupal11Router } from "./migrations/drupal11intellibridge";
import { checkWeaviate, writeSchema, writeWeaviate } from "./routes/weaviateRoutes";
import { createSchema } from "./routes/schemaRoutes";
import { deleteSite } from "./routes/siteRoutes";
import { createDrupalSite } from "./routes/windsailRoutes";
import { simpleSearch } from "./routes/WeaviatesSimplesearch";
import { nearTextSearch } from "./routes/nearTextFunction";
import authRouter from "./routes/authRoutes";
import { getUserData } from "./services/adminService";

// Set global options for all functions
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  memory: "1GiB",
  timeoutSeconds: 60,
  minInstances: 0,
  concurrency: 80,
  cpu: 1,
});

// Drupal 7 Express app
const drupal7App = express();
drupal7App.use(express.json());
drupal7App.use(cors({ origin: true }));
drupal7App.use("/", drupal7Router);
drupal7App.get("/healthz", (req, res) => {
  res.status(200).send("drupal7-ok");
});

// Drupal 11 Express app
const drupal11App = express();
drupal11App.use(express.json());
drupal11App.use(cors({ origin: true }));
drupal11App.use("/", drupal11Router);
drupal11App.get("/healthz", (req, res) => {
  res.status(200).send("drupal11-ok");
});

// Common options for functions
const commonOptions = {
  region: "us-central1",
  cors: ["https://app.intelligensi.ai", "http://localhost:3000", "https://drupal7.intelligensi.online"]
};

// Create function instances with common options and required secrets
const drupal7 = onRequest({
  ...commonOptions,
  secrets: [
    "SUPABASE_URL", 
    "SUPABASE_ANON_KEY", 
    "WEAVIATE_API_KEY", 
    "AWS_ACCESS_KEY", 
    "AWS_SECRET_KEY", 
    "AWS_REGION", 
    "AWS_KEY_PAIR", 
    "INSTANCE_PREFIX"
  ]
}, drupal7App);

const drupal11 = onRequest({
  ...commonOptions,
  secrets: [
    "SUPABASE_URL", 
    "SUPABASE_ANON_KEY", 
    "WEAVIATE_API_KEY", 
    "AWS_ACCESS_KEY", 
    "AWS_SECRET_KEY", 
    "AWS_REGION", 
    "AWS_KEY_PAIR", 
    "INSTANCE_PREFIX"
  ]
}, drupal11App);

// Auth Express app
const authApp = express();
authApp.use(express.json());
authApp.use(cors({ origin: true }));
authApp.use("/", authRouter);

const auth = onRequest({
  ...commonOptions,
  secrets: [
    "SUPABASE_URL", 
    "SUPABASE_ANON_KEY", 
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET"
  ]
}, authApp);

// Health check function
const healthcheck = onRequest({
  ...commonOptions,
  // No secrets needed for health check
}, (req, res) => {
  res.status(200).send("OK");
});

// Export all functions in a single export block
export {
  // HTTP Functions
  createSchema,
  checkWeaviate,
  writeSchema,
  writeWeaviate,
  updateHomepage,
  fetchusers,
  updateuser,
  fetchuser,
  deleteSite,
  createDrupalSite,
  simpleSearch,
  nearTextSearch,
  getUserData,
  // Express Apps
  drupal11,
  drupal7,
  auth,
  healthcheck,
  // Export the Express apps as well if needed by other parts of the application
  drupal11App,
  drupal7App,
  authApp,
};

// Note: ThemeCraft functions are commented out as they're not currently in use
// export const { scanWebsiteTheme, getUserThemeScans } = themeCraftFunctions;
