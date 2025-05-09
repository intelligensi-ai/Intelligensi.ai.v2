import { createClient } from '@supabase/supabase-js';

// Add more detailed logging for debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('Supabase URL available:', Boolean(process.env.REACT_APP_SUPABASE_URL));
console.log('Supabase Key available:', Boolean(process.env.REACT_APP_SUPABASE_ANON_KEY));

if (!process.env.REACT_APP_SUPABASE_URL) {
  console.error('Missing REACT_APP_SUPABASE_URL environment variable');
}
if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

// For production, fallback to hardcoded values if environment variables are not available
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hacvqagzlqobaktgcrkp.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3ZxYWd6bHFvYmFrdGdjcmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Mzk4NjUsImV4cCI6MjA1ODIxNTg2NX0.e9AjPyUe2DBe-ppVgy2fYl1CD_dLKpc8Z4Z3K6T0HDo';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key (first 10 chars):', supabaseKey.substring(0, 10) + '...');

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey);
}; 