// index.ts
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import openaiRoutes from "./routes/openaiRoutes";
import * as UserRoutes from "./routes/userRoutes";
import { onRequest } from "firebase-functions/v2/https";


// Set global Firebase Functions options
setGlobalOptions({
  region: "us-central1", // Choose your preferred region
  maxInstances: 10, // Optional: Limit instance count
});

// Export all user-related functions
export const fetchusers = UserRoutes.fetchusers;
export const updateuser = UserRoutes.updateuser;
export const fetchuser = UserRoutes.fetchuser;

// Optional: Basic health check endpoint
export const healthcheck = onRequest((req, res) => {
  logger.info("Health check called", { structuredData: true });
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});
