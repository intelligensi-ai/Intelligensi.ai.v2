import React, { useEffect, useState } from 'react';
import { testSupabaseConnection, testGetUser } from '../utils/testSupabase';
import { useAuth } from '../contexts/AuthContext';

export const TestSupabasePage: React.FC = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const runTests = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      // Test connection first
      const connectionResult = await testSupabaseConnection();
      
      if (connectionResult.success) {
        // If connection is good, try to get user if logged in
        if (currentUser) {
          const userResult = await testGetUser(currentUser.uid);
          setTestResult({
            connection: connectionResult,
            userData: userResult,
            currentUser: {
              uid: currentUser.uid,
              email: currentUser.email,
              emailVerified: currentUser.emailVerified,
              isAnonymous: currentUser.isAnonymous
            }
          });
        } else {
          // Just show connection result if not logged in
          setTestResult({
            connection: connectionResult,
            note: 'Not logged in - only testing connection',
            currentUser: null
          });
        }
      } else {
        setTestResult({
          connection: connectionResult,
          error: 'Failed to connect to Supabase'
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        error: 'Test failed',
        details: error
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Supabase Tests'}
          </button>
        </div>

        {testResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
            <pre className="bg-black text-green-400 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {currentUser && (
          <div className="mt-6 p-4 bg-green-50 rounded-md">
            <h3 className="font-semibold">Current User:</h3>
            <p>UID: {currentUser.uid}</p>
            <p>Email: {currentUser.email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSupabasePage;
