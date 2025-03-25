import { onRequest } from "firebase-functions/v2/https";
import { createClient } from "@supabase/supabase-js";

// Explicitly typed configuration
const SUPABASE_CONFIG = {
  url: "https://hacvqagzlqobaktgcrkp.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3ZxYWd6bHFvYmFrdGdjcmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Mzk4NjUsImV4cCI6MjA1ODIxNTg2NX0.e9AjPyUe2DBe-ppVgy2fYl1CD_dLKpc8Z4Z3K6T0HDo"
};

// Initialize Supabase client immediately
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
  auth: { persistSession: false }
});

// Used in the response type
interface _User {
  display_name: string;
}

export const fetchusers = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*");

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data.map((user) => user.display_name)
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
