import type { Request } from "firebase-functions/v2/https";
import { onRequest, HttpsError } from "firebase-functions/v2/https";
import { createClient } from "@supabase/supabase-js";
import { defineSecret } from "firebase-functions/params";
import cors from "cors";
import { z } from "zod";

// Firebase Secrets for Supabase
const supabaseUrl = defineSecret("SUPABASE_URL");
// Ensure this is the service_role key or a key with delete permissions
const supabaseKey = defineSecret("SUPABASE_KEY");

// Initialize Supabase Client
const getSupabaseClient = () => {
  const url = supabaseUrl.value();
  const key = supabaseKey.value();
  if (!url || !key) {
    throw new HttpsError("internal", "Supabase URL or Key is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
};

// CORS Middleware
const corsHandler = cors({ origin: true });

// Zod schema for delete site request body
const deleteSiteSchema = z.object({
  siteId: z.number().int().positive(),
});

/**
 * Deletes a site and its associated data from Supabase.
 */
export const deleteSite = onRequest(
  { secrets: [supabaseUrl, supabaseKey], cors: false }, // Let corsHandler manage CORS headers
  (req: Request, res) => {
    corsHandler(req, res, async (err?: Error) => {
      if (err) {
        console.error("CORS error:", err);
        res.status(500).json({ success: false, error: "Failed to process CORS" });
        return;
      }

      try {
        if (req.method !== "POST") { // Using POST, expect siteId in body
          res.setHeader("Allow", "POST");
          res.status(405).json({ success: false, error: "Method Not Allowed. Please use POST." });
          return;
        }

        const parseResult = deleteSiteSchema.safeParse(req.body);
        if (!parseResult.success) {
          throw new HttpsError(
            "invalid-argument",
            `Invalid request body: ${parseResult.error.flatten().fieldErrors}`,
          );
        }

        const { siteId } = parseResult.data;

        if (!siteId) { // Redundant due to Zod, but good for clarity
          throw new HttpsError("invalid-argument", "Missing required field: siteId");
        }

        const supabase = getSupabaseClient();

        // Potential cascade delete: If your DB is set up with cascades,
        // deleting from 'sites' might also delete related 'schemas', etc.
        // If not, you'll need to delete from other tables manually here.
        // For example:
        // await supabase.from("schemas").delete().eq("site_id", siteId);
        // await supabase.from("vectorized_content").delete().eq("site_id", siteId);

        const { error: deleteError } = await supabase
          .from("sites")
          .delete()
          .eq("id", siteId);

        if (deleteError) {
          console.error("Supabase delete error:", deleteError);
          throw new HttpsError("internal", `Failed to delete site: ${deleteError.message}`);
        }

        res.status(200).json({
          success: true,
          message: `Site with ID ${siteId} successfully deleted.`,
        });
      } catch (error: unknown) {
        console.error("Error in deleteSite function:", error);
        if (error instanceof HttpsError) {
          res.status(error.httpErrorCode.status).json({ success: false, error: error.message });
        } else {
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
          res.status(500).json({
            success: false,
            error: errorMessage,
          });
        }
      }
    });
  },
);
