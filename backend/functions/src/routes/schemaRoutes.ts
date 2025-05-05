import type { Request } from "firebase-functions/v2/https";
import { onRequest, HttpsError } from "firebase-functions/v2/https";
import { createClient } from "@supabase/supabase-js";
import { defineSecret } from "firebase-functions/params";
import cors from "cors";
import { z } from "zod";

// Firebase Secrets
const supabaseUrl = defineSecret("SUPABASE_URL");
const supabaseKey = defineSecret("SUPABASE_KEY");

// Initialize Supabase Client
const getSupabaseClient = () =>
  createClient(supabaseUrl.value(), supabaseKey.value(), {
    auth: { persistSession: false },
  });

// CORS Middleware
const corsHandler = cors({ origin: true });

/**
 * Infers a Zod schema from an example object
 * @param {Record<string, unknown>} obj - The example object to infer the schema from
 * @return {z.ZodObject<Record<string, z.ZodTypeAny>>} A Zod object schema representing the inferred structure
 */
function inferZodSchemaFromObject(obj: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string") {
        shape[key] = z.string();
      } else if (typeof value === "number") {
        shape[key] = z.number();
      } else if (typeof value === "boolean") {
        shape[key] = z.boolean();
      } else if (Array.isArray(value)) {
        shape[key] = z.array(z.unknown()); // Could refine if needed
      } else if (typeof value === "object" && value !== null) {
        shape[key] = z.object({}); // nested object — simplify for now
      } else {
        shape[key] = z.unknown();
      }
    }
  }

  return z.object(shape);
}

// Create a new schema
export const createSchema = onRequest(
  { cors: false, secrets: [supabaseUrl, supabaseKey] },
  (req: Request, res) => {
    corsHandler(req, res, async (err?: Error) => {
      if (err) {
        res.status(500).json({ error: "Failed to process CORS" });
        return;
      }

      try {
        if (req.method !== "POST") {
          res.status(405).json({ error: "Method Not Allowed" });
          return;
        }

        const supabase = getSupabaseClient();
        // Accept both snake_case and camelCase in request
        const {
          site_id: siteId,
          siteId: siteIdAlt,
          schema_name: schemaName,
          schemaName: schemaNameAlt,
          example_payload: examplePayload,
          examplePayload: examplePayloadAlt,
        } = req.body;

        const finalSiteId = siteId || siteIdAlt;
        const finalSchemaName = schemaName || schemaNameAlt;
        const finalExamplePayload = examplePayload || examplePayloadAlt;

        if (!finalSiteId || !finalExamplePayload || !finalSchemaName) {
          throw new HttpsError("invalid-argument", "Missing required fields");
        }

        const zodSchema = inferZodSchemaFromObject(finalExamplePayload);
        const schemaJSON = JSON.stringify(zodSchema._def);

        const { error } = await supabase.from("schemas").insert({
          site_id: finalSiteId,
          name: finalSchemaName,
          zod_schema: schemaJSON,
        });

        if (error) throw new HttpsError("internal", error.message);

        res.status(200).json({
          success: true,
          message: "Schema created",
          schema: JSON.parse(schemaJSON),
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  },
);
