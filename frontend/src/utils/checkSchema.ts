import { supabase } from './supabase';

export const checkSitesTable = async () => {
  try {
    // Get table schema information
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'sites');

    if (error) {
      console.error('Error fetching table schema:', error);
      return null;
    }

    console.log('Sites table schema:', columns);
    return columns;
  } catch (error) {
    console.error('Error in checkSitesTable:', error);
    return null;
  }
};

// Run the check when imported
checkSitesTable().then(columns => {
  if (columns) {
    console.log('Sites table columns:', columns.map(c => `${c.column_name} (${c.data_type}${c.is_nullable === 'YES' ? ', nullable' : ''})`).join('\n'));
  }
});
