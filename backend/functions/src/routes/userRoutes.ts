import type { Request } from "firebase-functions/v2/https";
import { onRequest, HttpsError } from "firebase-functions/v2/https";
import { createClient } from "@supabase/supabase-js";
import { defineSecret } from "firebase-functions/params";
import cors from "cors";

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

// Fetch all users
export const fetchusers = onRequest(
  { cors: false, secrets: [supabaseUrl, supabaseKey] },
  (req: Request, res) => {
    corsHandler(req, res, async (err?: Error) => {
      if (err) {
        res.status(500).json({ error: "Failed to process CORS" });
        return;
      }

      try {
        if (req.method !== "GET") {
          res.status(405).json({ error: "Method Not Allowed" });
          return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("display_name, id, uid, email, company_id, is_active, account_type");

        if (error) throw new HttpsError("internal", error.message);

        res.status(200).json({
          success: true,
          data: data.map((user) => ({
            displayName: user.display_name,
            id: user.id,
            uid: user.uid,
            email: user.email,
            companyId: user.company_id,
            isActive: user.is_active,
            accountType: user.account_type || "basic",
          })),
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

// Update user
export const updateuser = onRequest(
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

        const {
          uid,
          displayName,
          email,
          companyId,
          isActive = true,
        } = req.body;

        if (!uid || !email) {
          res.status(400).json({
            success: false,
            error: "UID and email are required",
          });
          return;
        }

        const supabase = getSupabaseClient();
        // First check if user exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("uid", uid)
          .single();

        const userData = {
          uid,
          display_name: displayName,
          email,
          company_id: companyId,
          is_active: isActive,
          updated_at: new Date().toISOString(),
          ...(req.body.accountType && { account_type: req.body.accountType }),
        };

        // Only set created_at for new users
        if (!existingUser) {
          userData.created_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from("users")
          .upsert(userData)
          .select();

        if (error) throw new HttpsError("internal", error.message);

        res.status(200).json({
          success: true,
          data: data?.[0] || null,
        });
      } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  },
);

// Fetch single user
export const fetchuser = onRequest(
  { cors: false, secrets: [supabaseUrl, supabaseKey] },
  (req: Request, res) => {
    corsHandler(req, res, async (err?: Error) => {
      if (err) {
        res.status(500).json({ error: "Failed to process CORS" });
        return;
      }

      try {
        if (req.method !== "GET") {
          res.status(405).json({ error: "Method Not Allowed" });
          return;
        }

        const { email, id, uid } = req.query;

        if (!email && !id && !uid) {
          res.status(400).json({
            success: false,
            error: "Must provide either email, id, or uid",
          });
          return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
          .from("users")
          .select(
            "display_name, id, uid, email, company_id, is_active, account_type, created_at, updated_at",
          );

        if (email) query = query.eq("email", email as string);
        else if (id) query = query.eq("id", id as string);
        else if (uid) query = query.eq("uid", uid as string);

        const { data, error } = await query.single();

        if (error) {
          if (error.code === "PGRST116") {
            res.status(404).json({ success: false, error: "User not found" });
            return;
          }
          throw new HttpsError("internal", error.message);
        }

        res.status(200).json({ success: true, data });
      } catch (error) {
        console.error("Fetch User Error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  },
);


