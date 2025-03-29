import express, { json } from "express";
import cors from "cors";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

// Import routes
import openaiRoutes from "./routes/openaiRoutes";
import userRoutes from "./routes/userRoutes";

// Configure function defaults
setGlobalOptions({
  timeoutSeconds: 60,
  memory: "1GiB",
  maxInstances: 10
});

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(json());

// API Routes
app.use("/api/openai", openaiRoutes);
app.use("/api/users", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ?
      "Something went wrong" :
      err.message
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export const api = onRequest(app);
