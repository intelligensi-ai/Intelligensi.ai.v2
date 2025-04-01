// index.ts
import { setGlobalOptions } from "firebase-functions/v2";
// Import all function handlers
import { updateHomepage } from "./routes/openaiRoutes";
import { fetchusers, updateuser, fetchuser } from "./routes/userRoutes";

// Define secrets
// const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Set global options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Export all functions directly (no /api prefix)
export {
  updateHomepage,
  fetchusers,
  updateuser,
  fetchuser,
};
// Export the main Express app as a Firebase function
