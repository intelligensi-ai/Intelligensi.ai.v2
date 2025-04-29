import { createClient } from '@supabase/supabase-js';

if (!process.env.REACT_APP_SUPABASE_URL) {
  console.error('Missing REACT_APP_SUPABASE_URL environment variable');
}
if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
}; 