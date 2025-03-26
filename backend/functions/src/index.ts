import { onRequest } from "firebase-functions/v2/https";
import { createClient } from "@supabase/supabase-js";
import { defineSecret } from "firebase-functions/params";

// ✅ Firebase Secrets
const supabaseUrl = defineSecret("SUPABASE_URL");
const supabaseKey = defineSecret("SUPABASE_KEY");

// ✅ Fetch users function
export const fetchusers = onRequest(
  {
    cors: true,
    secrets: [supabaseUrl, supabaseKey]
  },
  async (req, res) => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      const supabase = createClient(
        supabaseUrl.value(),
        supabaseKey.value(),
        { auth: { persistSession: false } }
      );

      const { data, error } = await supabase
        .from("users")
        .select("display_name, id, uid, email, company_id, is_active, profile_pic");

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: data.map((user) => ({
          display_name: user.display_name,
          id: user.id,
          uid: user.uid,
          email: user.email,
          company_id: user.company_id,
          is_active: user.is_active,
          profile_pic: user.profile_pic
        }))
      });
    } catch (error) {
      console.error("Fetch Users Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

/// ✅ New Function: Update User
export const updateuser = onRequest(
  {
    cors: true,
    secrets: [supabaseUrl, supabaseKey]
  },
  async (req, res) => {
    try {
      if (req.method !== "PUT") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      const { id } = req.params;  // Capture the ID from the URL
      const { display_name, email, company_id, is_active, profile_pic } = req.body;

      if (!id || !display_name || !email || !company_id) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const supabase = createClient(
        supabaseUrl.value(),
        supabaseKey.value(),
        { auth: { persistSession: false } }
      );

      const { data, error } = await supabase
        .from("users")
        .update({
          display_name,
          email,
          company_id,
          is_active,
          profile_pic
        })
        .eq("id", id);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data
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
