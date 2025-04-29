import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import { updateHomepage } from "./routes/openaiRoutes";
import { fetchusers, updateuser, fetchuser } from "./routes/userRoutes";
import drupal7Router from "./migrations/drupal7Migrations";
import { checkWeaviate, writeSchema, writeWeaviate } from "./routes/weaviateRoutes";
import { createSchema } from "./routes/schemaRoutes";

// Global settings
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Drupal 7 Express app
const drupal7App = express();
drupal7App.use("/", drupal7Router);

// Firebase HTTPS function for the Drupal 7 migration API
export const drupal7 = onRequest({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 60,
}, drupal7App);

// Export all other HTTPS functions
export {
  updateHomepage,
  fetchusers,
  updateuser,
  fetchuser,
  checkWeaviate,
  writeSchema,
  writeWeaviate,
  createSchema,
};
