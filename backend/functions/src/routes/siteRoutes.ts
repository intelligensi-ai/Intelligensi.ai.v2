import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, CallableContext } from "firebase-functions/v1/https";
import getSupabaseClient from "../services/supabaseService";

interface DeleteSiteData {
  siteId: number;
}

/**
 * Deletes a site record from the Supabase 'sites' table.
 * Expects a 'siteId' in the request body.
 */
export const deleteSite = onCall(async (data: DeleteSiteData, context: CallableContext) => {
  const supabase = getSupabaseClient();
  // Check authentication
  if (!context.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const siteId = data.siteId;

  if (typeof siteId !== "number") {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a numeric 'siteId' argument.",
    );
  }

  logger.info(`Attempting to delete site with ID: ${siteId}`);

  try {
    const { error } = await supabase
      .from("sites")
      .delete()
      .match({ id: siteId });

    if (error) {
      logger.error("Supabase delete error:", error);
      throw new HttpsError(
        "internal",
        "Failed to delete site from database.",
        error.message,
      );
    }

    logger.info(`Successfully deleted site with ID: ${siteId}`);
    return { success: true, message: "Site deleted successfully." };
  } catch (error: unknown) {
    logger.error("Error deleting site:", error);
    if (error instanceof HttpsError) {
      throw error;
    } else {
      let errorMessage = "An unexpected error occurred while deleting the site.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while deleting the site.",
        errorMessage,
      );
    }
  }
});
