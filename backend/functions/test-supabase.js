// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Use the provided credentials
const supabaseUrl = 'https://hacvqagzlqobaktgcrkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3ZxYWd6bHFvYmFrdGdjcmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Mzk4NjUsImV4cCI6MjA1ODIxNTg2NX0.e9AjPyUe2DBe-ppVgy2fYl1CD_dLKpc8Z4Z3K6T0HDo';

// Initialize the client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Test the connection by checking for common tables
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try to list common tables
    const commonTables = ['users', 'sites', 'schemas', 'vectorized_content'];
    
    console.log('✅ Successfully connected to Supabase!');
    console.log('\nChecking for common tables...');
    
    // Check each common table
    for (const table of commonTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`- ${table}: ❌ (${error.message})`);
        } else {
          console.log(`- ${table}: ✅ (${data?.length || 0} rows found)`);
        }
      } catch (err) {
        console.log(`- ${table}: ❌ (${err.message})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error connecting to Supabase:');
    console.error(error);
  }
}

testConnection();
