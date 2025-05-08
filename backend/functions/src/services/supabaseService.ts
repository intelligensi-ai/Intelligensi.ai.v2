import { createClient } from "@supabase/supabase-js";
import { defineString } from "firebase-functions/params";

// TODO: Replace with your actual Supabase URL and consider environment variables
const supabaseUrl = process.env.SUPABASE_URL || "https://hacvqagzlqobaktgcrkp.supabase.co";


const supabaseKeyParam = defineString("SUPABASE_ANON_KEY");

// Create and export Supabase client
const supabase = createClient(supabaseUrl, supabaseKeyParam.value(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log("Supabase client initialized with hardcoded credentials");

export default supabase;
