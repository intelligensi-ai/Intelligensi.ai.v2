import { onRequest } from "firebase-functions/v2/https";
import { createClient } from "@supabase/supabase-js";
import { defineSecret } from "firebase-functions/params";

// ✅ Define Firebase Secrets
const supabaseUrl = defineSecret("SUPABASE_URL");
const supabaseKey = defineSecret("SUPABASE_KEY");

// ✅ Use secrets inside the function runtime

// update subabase fetch user function

export const fetchusers = onRequest(
  {
    cors: true,
    secrets: [supabaseUrl, supabaseKey] // Include secrets here!
  },
  async (req, res) => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      // ✅ Initialize Supabase client with secret values
      const supabase = createClient(
        supabaseUrl.value(),
        supabaseKey.value(),
        { auth: { persistSession: false } }
      );

      const { data, error } = await supabase.from("users")
        .select("display_name, id, uid, email, company_id, is_active");

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: data.map((user) => ({
          display_name: user.display_name,
          id: user.id,
          uid: user.uid,
          email: user.email,
          company_id: user.company_id,
          is_active: user.is_active
        }))
      });
    } catch (error) {
      console.error(" Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// update subabase update user function

export const updateuser = onRequest(
  {
    cors: true,
    secrets: [supabaseUrl, supabaseKey]
  },
  async (req, res) => {
    try {
      // Check for POST method
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      // Validate request body
      const {
        uid,
        displayName,
        email,
        companyId,
        isActive = true
      } = req.body;

      // Validate required fields
      if (!uid || !email) {
        res.status(400).json({
          success: false,
          error: "UID and email are required"
        });
        return;
      }

      // Initialize Supabase client with secret values
      const supabase = createClient(
        supabaseUrl.value(),
        supabaseKey.value(),
        { auth: { persistSession: false } }
      );

      // Perform upsert operation
      const { data, error } = await supabase
        .from("users")
        .upsert({
          uid,
          display_name: displayName,
          email,
          company_id: companyId,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: data?.[0] || null
      });
    } catch (error) {
      console.error("Update User Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
