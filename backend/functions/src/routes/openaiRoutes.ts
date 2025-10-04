import { onRequest } from "firebase-functions/v2/https";
// import { defineSecret } from "firebase-functions/params";  // Unused import
import * as admin from "firebase-admin";
import { sendResponse } from "../utils/http";
import { handleUpdateHomepage as controllerHandleUpdateHomepage } from "../controllers/openaiController";

// Constants
const STORAGE_BUCKET = "intelligensi-ai-v2.firebasestorage.app";

// Emulator-specific HTTPS override removed; using default agents

// Drupal-specific constants and types are defined in services/controllers

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: STORAGE_BUCKET, // Forces the right bucket
    });
  } catch {
    // ignore
  }
}

// helpers moved to ../utils/http and ../utils/text

// menu operations moved to ../drupal/menuService

// Main function to handle the request
export const updateHomepage = onRequest(
  {
    secrets: ["OPENAI_API_KEY"],
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (!req.body?.prompt) {
        return sendResponse(res, 400, { error: "Prompt is required" });
      }
      const { results } = await controllerHandleUpdateHomepage(req.body);
      return sendResponse(res, 200, {
        success: true,
        message: "Operation completed successfully",
        data: results,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      return sendResponse(res, 500, {
        success: false,
        message: "An unexpected error occurred",
        error: errMsg,
      });
    }
  }
);
