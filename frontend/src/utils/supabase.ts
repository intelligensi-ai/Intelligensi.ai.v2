import { createClient } from '@supabase/supabase-js';

// Add more detailed logging for debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('Supabase URL available:', Boolean(process.env.REACT_APP_SUPABASE_URL));
console.log('Supabase Anon Key available:', Boolean(process.env.REACT_APP_SUPABASE_ANON_KEY));
console.log('Supabase Service Role Key available:', Boolean(process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY));

if (!process.env.REACT_APP_SUPABASE_URL) {
  console.error('Missing REACT_APP_SUPABASE_URL environment variable');
}
if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

// For production, fallback to hardcoded values if environment variables are not available
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hacvqagzlqobaktgcrkp.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3ZxYWd6bHFvYmFrdGdjcmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Mzk4NjUsImV4cCI6MjA1ODIxNTg2NX0.e9AjPyUe2DBe-ppVgy2fYl1CD_dLKpc8Z4Z3K6T0HDo';
const supabaseServiceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');

// Create regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client for admin operations (only available server-side in production)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (process.env.NODE_ENV === 'development' && supabaseServiceRoleKey) {
  // Only create admin client in development with service role key
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('Supabase Admin client initialized');
}

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Helper to get admin client (returns null in production or if not configured)
export const getAdminClient = () => {
  return supabaseAdmin;
}; 