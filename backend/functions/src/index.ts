// index.ts
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
// Import all function handlers
import { updateHomepage } from "./routes/openaiRoutes";
import { fetchusers, updateuser, fetchuser } from "./routes/userRoutes";
import drupal7Router from "./migrations/drupal7Migrations";

// Set global options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Create an Express app for Drupal7 routes
const drupal7App = express();
drupal7App.use("/", drupal7Router);

// Export all functions directly (no /api prefix)
export {
  updateHomepage,
  fetchusers,
  updateuser,
  fetchuser,
};

// Export Drupal 7 migration endpoints
export const drupal7 = onRequest({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 60,
}, drupal7App);
