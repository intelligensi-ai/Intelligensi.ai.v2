import { createClient } from "@supabase/supabase-js";

// TODO: Replace with your actual Supabase URL and consider environment variables
const supabaseUrl = process.env.SUPABASE_URL || "https://hacvqagzlqobaktgcrkp.supabase.co";

// WARNING: This key is hardcoded. Consider moving to Firebase secrets or environment variables.
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3ZxYWd6bHFvYmFrdGdjcmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Mzk4NjUsImV4cCI6MjA1ODIxNTg2NX0.e9AjPyUe2DBe-ppVgy2fYl1CD_dLKpc8Z4Z3K6T0HDo";

// Create and export Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log("Supabase client initialized with hardcoded credentials");

export default supabase;
