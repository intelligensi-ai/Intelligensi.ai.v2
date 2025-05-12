import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { defineString } from "firebase-functions/params";

const supabaseUrl = process.env.SUPABASE_URL || "https://hacvqagzlqobaktgcrkp.supabase.co";
const supabaseKeyParam = defineString("SUPABASE_ANON_KEY");

let supabase: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    // console.log("Initializing Supabase client..."); // Optional: for debugging
    supabase = createClient(supabaseUrl, supabaseKeyParam.value(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    // console.log("Supabase client initialized."); // Optional: for debugging
  }
  return supabase;
};

export default getSupabaseClient;
