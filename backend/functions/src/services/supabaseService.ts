import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { defineString } from "firebase-functions/params";

let cachedClient: SupabaseClient | null = null;

/**
 * Get a cached Supabase client or initialize a new one.
 *
 * Preference order for the anon key during local/emulator use:
 * - SUPABASE_ANON_KEY
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - REACT_APP_SUPABASE_ANON_KEY
 * Falls back to the Firebase runtime param `SUPABASE_ANON_KEY` when not set in env.
 *
 * @return {SupabaseClient} Initialized Supabase client instance (cached across calls)
 */
export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL || "https://hacvqagzlqobaktgcrkp.supabase.co";
  const supabaseKeyParam = defineString("SUPABASE_ANON_KEY");

  // Prefer ENV in emulators/local; if missing, use param at runtime
  const envKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    "";
  const keySource = envKey ? "ENV" : "PARAM";
  const supabaseKey = envKey || supabaseKeyParam.value();

  if (!supabaseKey) {
    // Help debug when env wasn't loaded as expected
    console.error(
      "Supabase key not found. Checked SUPABASE_ANON_KEY, " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY, REACT_APP_SUPABASE_ANON_KEY."
    );
    throw new Error("supabaseKey is required.");
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log(`Supabase client initialized for ${supabaseUrl} using ${keySource} key`);
  return cachedClient;
}
