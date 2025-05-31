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
  // Create a copy of the object to avoid mutating the original
  const processedObj = { ...obj };

  // Common numeric fields in Drupal that should be coerced to numbers
  type NumericField = "nid" | "created" | "changed" | "uid" | "vid" | "revision_id" | "revision_uid";
  const NUMERIC_FIELDS: NumericField[] = ["nid", "created", "changed", "uid", "vid", "revision_id", "revision_uid"];

  // Convert numeric fields to numbers before inference
  NUMERIC_FIELDS.forEach((field) => {
    if (field in processedObj && typeof processedObj[field] === "string") {
      const asNumber = parseInt(processedObj[field] as string, 10);
      if (!isNaN(asNumber)) {
        processedObj[field] = asNumber;
      }
    }
  });

  const shape: Record<string, z.ZodTypeAny> = {};

  // Common optional fields in Drupal
  type OptionalField =
    | "field_image" | "field_tags" | "field_category" | "field_body" | "field_summary"
    | "field_media" | "field_date" | "field_link" | "field_reference" | "field_boolean"
    | "field_paragraph" | "field_entity_reference" | "field_taxonomy" | "field_terms";

  const OPTIONAL_FIELDS: readonly OptionalField[] = [
    "field_image", "field_tags", "field_category", "field_body", "field_summary",
    "field_media", "field_date", "field_link", "field_reference", "field_boolean",
    "field_paragraph", "field_entity_reference", "field_taxonomy", "field_terms",
  ] as const;

  // Common field types that should be treated as optional objects
  const OPTIONAL_OBJECT_FIELDS = ["field_image", "field_media", "field_paragraph", "field_entity_reference"] as const;

  // Common field types that should be treated as arrays
  const ARRAY_FIELDS = ["field_tags", "field_terms", "field_reference", "field_paragraph"] as const;

  for (const key in processedObj) {
    if (!Object.prototype.hasOwnProperty.call(processedObj, key)) continue;

    const value = processedObj[key];
    let fieldSchema: z.ZodTypeAny;

    // Explicitly handle numeric fields
    if (NUMERIC_FIELDS.includes(key as NumericField)) {
      fieldSchema = z.coerce.number();
    } else if (key.startsWith("field_")) {
      // Handle common Drupal fields
      if (OPTIONAL_OBJECT_FIELDS.some((prefix: string) => key.startsWith(prefix))) {
        // Handle object fields (images, media, etc.)
        fieldSchema = z.record(z.unknown()).optional();
      } else if (ARRAY_FIELDS.some((prefix: string) => key.startsWith(prefix))) {
        // Handle array fields (tags, terms, etc.)
        fieldSchema = z.array(z.unknown()).optional();
      } else if (key.endsWith("_value") || key.endsWith("_format") || key.endsWith("_summary")) {
        // Handle text format fields
        fieldSchema = z.string().optional();
      } else {
        // Default for other field_* fields
        fieldSchema = z.unknown().optional();
      }
    } else {
      // Handle standard fields
      // Pass the key to inferFieldType for better type inference
      fieldSchema = inferFieldType(value, key);

      // Make common optional fields optional
      if ((OPTIONAL_FIELDS as readonly string[]).includes(key) || key.endsWith("_value") || key.endsWith("_format")) {
        fieldSchema = fieldSchema.optional();
      }
    }

    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

// Common numeric fields in Drupal that should be coerced to numbers
type NumericField = "nid" | "created" | "changed" | "uid" | "vid" | "revision_id" | "revision_uid";
const NUMERIC_FIELDS: NumericField[] = ["nid", "created", "changed", "uid", "vid", "revision_id", "revision_uid"];


/**
 * Infers the appropriate Zod type for a field value
 * @param {unknown} value - The value to infer the type from
 * @param {string} [key] - Optional key name for special handling
 * @return {z.ZodTypeAny} The inferred Zod type
 */
function inferFieldType(value: unknown, key?: string): z.ZodTypeAny {
  if (value === null || value === undefined) {
    return z.any();
  }

  // Handle numeric fields first
  if (key && NUMERIC_FIELDS.includes(key as NumericField)) {
    return z.coerce.number();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return z.array(z.any());
    // For non-empty arrays, infer type from the first element
    return z.array(inferFieldType(value[0]));
  }

  // Handle objects
  if (typeof value === "object") {
    // Handle Date objects
    if (value instanceof Date) {
      return z.date();
    }
    // Handle plain objects
    if (Object.getPrototypeOf(value) === Object.prototype) {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [k, v] of Object.entries(value)) {
        shape[k] = inferFieldType(v, k);
      }
      return z.object(shape);
    }
  }

  // Handle string values that might be numbers
  if (typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "") {
    return z.coerce.number();
  }

  // Handle other primitive types
  switch (typeof value) {
  case "string":
    return z.string();
  case "number":
    return z.number();
  case "boolean":
    return z.boolean();
  default:
    return z.unknown();
  }
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
          !finalCreatedBy || typeof finalCreatedBy !== "string"
        ) {
          console.error("Validation Error: Missing or invalid required fields.", {
            finalSiteId,
            finalCmsId,
            finalPayloadExists: !!finalPayload,
            finalCreatedBy,
          });
          throw new HttpsError("invalid-argument", "Request missing fields: siteId, cmsId, payload, createdBy");
        }

        // Log the payload that will be used for schema inference (this is the raw payload from request)
        console.log("[createSchema] Raw payload from request (finalPayload):", JSON.stringify(finalPayload, null, 2));

        let objectForSchemaInference: Record<string, unknown>;

        if (typeof finalPayload === "object" && finalPayload !== null) {
          // Attempt to access finalPayload.structure safely
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const structure = (finalPayload as Record<string, any>)["structure"];

          if (Array.isArray(structure) &&
              structure.length > 0 &&
              typeof structure[0] === "object" &&
              structure[0] !== null) {
            console.log("[createSchema] Extracting first element from finalPayload.structure for schema inference.");
            objectForSchemaInference = structure[0] as Record<string, unknown>;
          } else {
            // If no valid 'structure' array, or if it's empty, or if finalPayload has no 'structure' property,
            // assume finalPayload itself is the object for inference.
            console.log("[createSchema] Using finalPayload directly (no valid .structure[0] found).");
            objectForSchemaInference = finalPayload as Record<string, unknown>;
          }
        } else {
          console.error("[createSchema] finalPayload is not a valid object or is null.");
          throw new HttpsError("invalid-argument", "Received invalid payload: not an object or null.");
        }

        if (!objectForSchemaInference || Object.keys(objectForSchemaInference).length === 0) {
          console.error(
            "[createSchema] Inference object is null/empty after payload processing.",
            objectForSchemaInference
          );
          throw new HttpsError("invalid-argument", "Could not derive valid object for schema inference.");
        }

        console.log("[createSchema] Schema inference object:", JSON.stringify(objectForSchemaInference, null, 2));

        // Create a deep copy of the object to avoid mutating the original
        const raw = JSON.parse(JSON.stringify(objectForSchemaInference));

        // 1. Force convert numeric fields to numbers before inference
        NUMERIC_FIELDS.forEach((field) => {
          if (raw[field] !== undefined && raw[field] !== null) {
            if (typeof raw[field] === "string") {
              // For string values, try to parse as number
              const num = Number(raw[field]);
              if (!isNaN(num)) {
                raw[field] = num;
              }
            } else if (typeof raw[field] === "object" && raw[field] !== null) {
              // Handle nested objects (e.g., for array items)
              Object.entries(raw[field]).forEach(([k, v]) => {
                if (typeof v === "string" && !isNaN(Number(v))) {
                  raw[field][k] = Number(v);
                }
              });
            }
          }
        });

        // Log the type of nid for debugging
        console.log("[createSchema] Type of nid after conversion:", typeof raw.nid);

        // 2. Infer the schema after type conversion
        const zodSchema = inferZodSchemaFromObject(raw);

        // 3. Get and verify the schema shape
        const shape = typeof zodSchema._def.shape === "function" ?
          zodSchema._def.shape() :
          zodSchema._def.shape;

        // Log the type of nid in the final schema
        console.log("[createSchema] Schema nid type:", shape.nid?._def?.typeName);

        // Process the shape to ensure numeric fields are properly typed
        const processedShape: Record<string, unknown> = {};

        for (const [key, fieldSchema] of Object.entries(shape)) {
          if (NUMERIC_FIELDS.includes(key as NumericField)) {
            processedShape[key] = {
              "_def": {
                typeName: "ZodNumber",
                coerce: true,
                checks: [],
              },
              "~standard": { version: 1, vendor: "zod" },
            };
          } else {
            // For non-numeric fields, keep the original schema
            processedShape[key] = fieldSchema;
          }
        }

        // Prepare the schema definition for storing
        const schemaDefToStore = {
          typeName: "ZodObject",
          unknownKeys: "strip",
          catchall: {
            "_def": {
              typeName: "ZodNever",
            },
            "~standard": { version: 1, vendor: "zod" },
          },
          shape: processedShape,
        };

        // Convert to JSON for storage
        const schemaJSON = JSON.stringify(schemaDefToStore);

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
          // Broke select statement into multiple lines to address max-len
          .select([
            "id", "site_id", "cms_id", "schema_json",
            "description", "version", "created_by",
            "created_at", "updated_at",
          ].join(", "));

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
