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

export const updateuser = onRequest(
  {
    cors: true,
    secrets: [supabaseUrl, supabaseKey],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      const {
        uid,
        displayName,       // camelCase for TS
        email,
        password,
        companyId,           // camelCase for TS
        profilePicture = '',  // camelCase for TS
        isActive = true,
      } = req.body;

      // ✅ Field validation
      if (!uid || !email) {
        res.status(400).json({
          success: false,
          error: "UID and email are required",
        });
        return;
      }

      // ✅ Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // ✅ Map camelCase to snake_case for Supabase
      const userData = {
        uid,
        display_name: displayName,          // snake_case for Supabase
        email,
        password,
        company_id: companyId,              // snake_case
        profile_picture: profilePicture,    // snake_case
        is_active: isActive,                // snake_case
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // ✅ Upsert Operation
      const { data, error } = await supabase
        .from("users")
        .upsert(userData, { onConflict: ["uid"] })
        .select();

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: "User added or updated successfully",
        data: data?.[0] || null,
      });

    } catch (error: any) {
      console.error("🔥 Update User Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);


// New fetchuser function
export const fetchuser = onRequest(
  {
    cors: true,
    secrets: [supabaseUrl, supabaseKey]
  },
  async (req, res) => {
    try {
      // Check for GET method
      if (req.method !== "GET") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      // Extract query parameters
      const { email, id, uid } = req.query;

      // Validate that at least one identifier is provided
      if (!email && !id && !uid) {
        res.status(400).json({
          success: false,
          error: "Must provide either email, id, or uid"
        });
        return;
      }

      // Initialize Supabase client with secret values
      const supabase = createClient(
        supabaseUrl.value(),
        supabaseKey.value(),
        { auth: { persistSession: false } }
      );

      // Prepare the query
      let query = supabase.from("users").select(
        "display_name, id, uid, email, company_id, is_active, created_at, updated_at"
      );

      // Add filter based on provided identifier
      if (email) {
        query = query.eq("email", email);
      } else if (id) {
        query = query.eq("id", id);
      } else if (uid) {
        query = query.eq("uid", uid);
      }

      // Execute the query
      const { data, error } = await query.single();

      if (error) {
        // Handle case where no user is found
        if (error.code === "PGRST116") {
          res.status(404).json({
            success: false,
            error: "User not found"
          });
          return;
        }
        throw error;
      }

      // Return the user data
      res.status(200).json({
        success: true,
        data: {
          display_name: data.display_name,
          id: data.id,
          uid: data.uid,
          email: data.email,
          company_id: data.company_id,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
      });
    } catch (error) {
      console.error("Fetch User Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
