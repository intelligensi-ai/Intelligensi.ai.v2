import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const TestSupabase: React.FC = () => {
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection by listing tables
        const { data, error } = await supabase
          .from('pg_tables')
          .select('*')
          .eq('schemaname', 'public');

        if (error) {
          console.error('Error fetching tables:', error);
          setError(`Error: ${error.message}`);
          return;
        }

        console.log('Tables in public schema:', data);
        setTables(data || []);

        // Try to get sites table structure
        try {
          const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'sites');

          if (columnsError) {
            console.error('Error fetching columns:', columnsError);
            setError(prev => `${prev}\nError fetching columns: ${columnsError.message}`);
          } else {
            console.log('Sites table columns:', columns);
          }
        } catch (e) {
          console.error('Error in schema check:', e);
        }
      } catch (err) {
        console.error('Error in testConnection:', err);
        setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  if (loading) {
    return <div>Testing Supabase connection...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Supabase Connection Test</h2>
      
      {error ? (
        <div style={{ color: 'red' }}>
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      ) : (
        <div>
          <h3>Connection successful!</h3>
          <h4>Tables in public schema:</h4>
          <ul>
            {tables.map((table, index) => (
              <li key={index}>
                {table.tablename} (owner: {table.tableowner})
              </li>
            ))}
          </ul>
          
          <h4>Check console for detailed schema information</h4>
        </div>
      )}
    </div>
  );
};

export default TestSupabase;
