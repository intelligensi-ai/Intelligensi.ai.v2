// index.ts
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";

import openaiRoutes from "./routes/openaiRoutes";
// Keep importing everything from userRoutes to easily access the exported functions
import * as UserRoutes from "./routes/userRoutes";

// ✅ Set global Firebase Functions options
setGlobalOptions({
  region: "us-central1", // Choose your preferred region
  maxInstances: 10, // Optional: Limit instance count
});

// ✅ Initialize Express app (This will handle routes defined directly on it)
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Register routes that ARE Express routers or handlers
app.use("/openai", openaiRoutes); // OpenAI routes (uses an Express router)
// ❌ REMOVE THIS LINE - UserRoutes doesn't export a router
// app.use("/users", UserRoutes.router);

// ✅ Export the main Express app as a single Firebase function (for /openai, /healthcheck etc.)
export const api = onRequest(app);

// ✅ Export individual user functions DEFINED in userRoutes.ts
// These will be deployed as separate Firebase Functions (e.g., .../fetchusers, .../updateuser)
export const fetchusers = UserRoutes.fetchusers;
export const updateuser = UserRoutes.updateuser;
export const fetchuser = UserRoutes.fetchuser;

// ✅ Optional: Basic health check endpoint (handled by the 'api' function)
// Note: The path for this within 'api' will be just /healthcheck
app.get("/healthcheck", (req, res) => { // Changed to use app.get for clarity
  logger.info("Health check called", { structuredData: true });
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// If you want the health check as a separate function (like user functions):
// export const healthcheck = onRequest((req, res) => {
//   logger.info("Health check called", { structuredData: true });
//   res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
// });
