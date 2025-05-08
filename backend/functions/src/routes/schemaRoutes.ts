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
          cms_id: cmsId,
          cmsId: cmsIdAlt,
          example_payload: examplePayload,
          examplePayload: examplePayloadAlt,
          description,
          version,
          created_by: createdBy,
          createdBy: createdByAlt,
        } = req.body;

        // Coerce and validate IDs
        const finalSiteId = Number(siteId ?? siteIdAlt);
        const finalCmsId = Number(cmsId ?? cmsIdAlt);
        const finalPayload = examplePayload ?? examplePayloadAlt;
        const finalDesc = description ?? "";
        const finalVersion = version ?? "1.0.0";
        const finalCreatedBy = createdBy ?? createdByAlt;

        if (
          isNaN(finalSiteId) ||
          isNaN(finalCmsId) ||
          !finalPayload ||
          !finalCreatedBy || typeof finalCreatedBy !== 'string'
        ) {
          console.error("Validation Error: Missing or invalid required fields.", { 
            finalSiteId, 
            finalCmsId, 
            finalPayloadExists: !!finalPayload, 
            finalCreatedBy 
          });
          throw new HttpsError("invalid-argument", "Missing or invalid required fields (siteId, cmsId, payload, or createdBy)");
        }

        // Log the payload that will be used for schema inference (this is the raw payload from request)
        console.log("[createSchema] Raw payload from request (finalPayload):", JSON.stringify(finalPayload, null, 2));

        let objectForSchemaInference: Record<string, unknown> | null = null;

        // Check if finalPayload has a 'structure' array and use its first element
        if (finalPayload && 
            typeof finalPayload === 'object' && 
            finalPayload !== null &&
            Object.prototype.hasOwnProperty.call(finalPayload, 'structure') &&
            Array.isArray((finalPayload as any).structure) &&
            (finalPayload as any).structure.length > 0 &&
            typeof (finalPayload as any).structure[0] === 'object' &&
            (finalPayload as any).structure[0] !== null) {
          console.log("[createSchema] Extracting first element from finalPayload.structure for schema inference.");
          objectForSchemaInference = (finalPayload as any).structure[0] as Record<string, unknown>;
        } else if (finalPayload && typeof finalPayload === 'object' && finalPayload !== null) {
          // Fallback: if finalPayload is an object but not in the {structure: []} format, use it directly.
          // This might be the case if the frontend already sent a single article.
          console.log("[createSchema] finalPayload is not in {structure: []} format or structure array is invalid/empty. Using finalPayload directly.");
          objectForSchemaInference = finalPayload as Record<string, unknown>;
        } else {
          console.error("[createSchema] finalPayload is not a valid object or is null.");
          throw new HttpsError("invalid-argument", "Received invalid payload for schema creation.");
        }

        if (!objectForSchemaInference || Object.keys(objectForSchemaInference).length === 0) {
          console.error("[createSchema] Object for schema inference is null or empty after processing finalPayload.", objectForSchemaInference);
          throw new HttpsError("invalid-argument", "Could not derive a valid object for schema inference from the payload.");
        }
        
        console.log("[createSchema] Actual object for schema inference:", JSON.stringify(objectForSchemaInference, null, 2));

        // Infer Zod schema from the determined objectForSchemaInference
        const zodSchema = inferZodSchemaFromObject(objectForSchemaInference);

        // Prepare the schema definition for storing, handling if _def.shape is a function
        let schemaDefToStore: any = zodSchema._def;
        if (zodSchema._def && typeof zodSchema._def.shape === 'function') {
          console.log("[createSchema] zodSchema._def.shape is a function. Calling it to resolve the shape.");
          schemaDefToStore = {
            typeName: zodSchema._def.typeName,
            unknownKeys: (zodSchema._def as any).unknownKeys,
            catchall: (zodSchema._def as any).catchall,
            shape: zodSchema._def.shape(), // Call the function to get the plain shape object
          };
        } else {
          console.log("[createSchema] zodSchema._def.shape is not a function or _def is not as expected. Using _def directly.");
        }

        const schemaJSON = JSON.stringify(schemaDefToStore);
        // Log the generated schemaJSON
        console.log("[createSchema] Generated schema JSON (after potential shape() call):", schemaJSON);

        // Insert into your "schemas" table
        const { data, error } = await supabase
          .from("schemas")
          .insert({
            site_id: finalSiteId,
            cms_id: finalCmsId,
            schema_json: schemaJSON,
            description: finalDesc,
            version: finalVersion,
            created_by: finalCreatedBy,
          })
          .select('id, site_id, cms_id, schema_json, description, version, created_by, created_at, updated_at'); // optional: get back the inserted row

        if (error) throw new HttpsError("internal", error.message);

        // Return success with the new schema row
        res.status(200).json({
          success: true,
          message: "Schema created",
          schema: data?.[0],
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }
);
