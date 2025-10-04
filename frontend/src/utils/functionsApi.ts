// Centralized API base URL resolution for emulator vs production
// Usage: import { getApiBaseUrl } from "../utils/api";

export function getApiBaseUrl(): string {
  const env = process.env.REACT_APP_API_BASE_URL?.trim();
  if (env && !/^(http:\/\/)?(localhost|127\.0\.0\.1)/i.test(env)) {
    return env;
  }
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  return isLocal
    ? "http://127.0.0.1:5001/intelligensi-ai-v2/us-central1"
    : "https://us-central1-intelligensi-ai-v2.cloudfunctions.net";
}
