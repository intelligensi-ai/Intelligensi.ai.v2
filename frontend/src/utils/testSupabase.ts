import { supabase, getAdminClient } from './supabase';

export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  
  try {
    // Test the connection by getting the current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Supabase auth error:', error);
      return { success: false, error };
    }

    console.log('Supabase connection successful! Session:', session);
    return { 
      success: true, 
      data: { 
        isAuthenticated: !!session,
        user: session?.user 
      } 
    };
  } catch (error) {
    console.error('Unexpected error testing Supabase:', error);
    return { success: false, error };
  }
};

// Export a function to test user retrieval
export const testGetUser = async (userId: string) => {
  console.log('Testing user retrieval in Supabase...');
  
  try {
    const adminClient = getAdminClient();
    
    if (!adminClient) {
      console.warn('Admin client not available - skipping user lookup');
      return { 
        success: false, 
        error: 'Admin client not available. Set REACT_APP_SUPABASE_SERVICE_ROLE_KEY in development.'
      };
    }
    
    // Get user by ID using the admin API
    const { data, error } = await adminClient.auth.admin.getUserById(userId);

    if (error) {
      console.error('Supabase get user error:', error);
      return { success: false, error };
    }

    console.log('Retrieved user from Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error getting user from Supabase:', error);
    return { success: false, error };
  }
};
