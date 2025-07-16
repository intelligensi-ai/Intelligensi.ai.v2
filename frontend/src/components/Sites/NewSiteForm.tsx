import React, { useState, useEffect } from 'react';
import { ISite, ICMS } from '../../types/sites';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { getAuth, User } from 'firebase/auth';
import axios from 'axios';

interface NewSiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: ISite) => void;
  initialData?: ISite | null;
  currentUser: User | null;
}

const CMS_OPTIONS: ICMS[] = [
  { id: 1, name: 'Drupal', version: '7' },
  { id: 2, name: 'Drupal', version: '11' },
  { id: 3, name: 'WordPress', version: '' },
  { id: 4, name: 'Joomla', version: '' },
];

const NewSiteForm: React.FC<NewSiteFormProps> = ({ isOpen, onClose, onSave, initialData, currentUser }) => {
  const [formData, setFormData] = useState<ISite>(() => {
    const defaultCms = CMS_OPTIONS.find(cms => cms.name === 'Drupal') || CMS_OPTIONS[0];
    return {
      id: initialData?.id,
      user_id: initialData?.user_id || currentUser?.uid || '',
      cms: initialData?.cms || defaultCms,
      site_name: initialData?.site_name || '',
      site_url: initialData?.site_url || '',
      description: initialData?.description || '',
      mysql_file_url: initialData?.mysql_file_url || null,
      status: initialData?.status || 'active',
      migration_ids: initialData?.migration_ids || null,
      tags: initialData?.tags || null,
      is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
      is_selected: initialData?.is_selected !== undefined ? initialData.is_selected : false,
      schema_id: initialData?.schema_id || null,
      // Drupal specific fields
      drupal_username: initialData?.drupal_username || 'admin',
      drupal_password: initialData?.drupal_password || '',
      // Timestamps
      created_at: initialData?.created_at || new Date().toISOString(),
      updated_at: initialData?.updated_at || new Date().toISOString(),
      company_id: initialData?.company_id || null,
    };
  });
  
  // Check if the selected CMS is Drupal 11
  const isDrupal11 = formData.cms?.name === 'Drupal' && formData.cms?.version === '11';
  const [useHttps, setUseHttps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        const msg = 'Database configuration is missing. Please check your environment variables.';
        console.error(msg);
        setError(msg);
        setIsLoading(false);
        return;
      }

      try {
        // Get current user from Firebase
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        console.log('Current Firebase user:', currentUser);
        
        if (!currentUser) {
          const msg = 'No authenticated user found. Please sign in again.';
          console.error(msg);
          setError(msg);
          setIsLoading(false);
          return;
        }

        // Get or create Supabase user
        console.log('Checking for existing Supabase user with Firebase UID:', currentUser.uid);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, uid, email')
          .eq('uid', currentUser.uid)
          .single();

        if (userError) {
          console.error('Error fetching Supabase user:', userError);
        }

        console.log('Supabase user data:', userData);

        if (!userData) {
          console.log('No existing user found, creating new Supabase user for:', currentUser.email);
          // Create the user in Supabase if they don't exist
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              uid: currentUser.uid,
              email: currentUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select('id, uid, email')
            .single();

          if (createError) {
            // If we get a unique constraint error, try to fetch the user again
            if (createError.message.includes('duplicate key value')) {
              const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('id, uid, email')
                .eq('uid', currentUser.uid)
                .single();

              if (fetchError || !existingUser) {
                console.error('Error fetching existing user:', fetchError);
                throw new Error('Failed to get user information');
              }

              console.log('Found existing user after conflict:', existingUser);
              setSupabaseUserId(existingUser.id);
              setFormData(prev => ({
                ...prev,
                user_id: existingUser.id
              }));
              return;
            }

            console.error('Error creating Supabase user:', createError);
            throw new Error(`Failed to create user in database: ${createError.message}`);
          }
          
          if (!newUser) {
            throw new Error('User creation succeeded but no user data returned');
          }

          console.log('Successfully created new Supabase user:', newUser);
          setSupabaseUserId(newUser.id);
          setFormData(prev => ({
            ...prev,
            user_id: newUser.id
          }));
        } else {
          console.log('Found existing Supabase user:', userData);
          setSupabaseUserId(userData.id);
          setFormData(prev => ({
            ...prev,
            user_id: userData.id
          }));
        }

        // Set initial data if provided
        if (initialData) {
          console.log('Setting initial form data:', initialData);
          setFormData(prev => ({
            ...initialData,
            user_id: prev.user_id // Keep the Supabase user ID
          }));
          if (initialData.site_url) {
            setUseHttps(initialData.site_url.startsWith('https://'));
          }
        }
      } catch (error) {
        console.error('Error in user initialization:', {
          error,
          errorString: String(error),
          errorName: error?.name,
          errorMessage: error?.message,
          errorStack: error?.stack,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        
        let errorMessage = 'An unknown error occurred';
        
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      console.log('Form opened, initializing user...');
      initializeUser();
    }
  }, [initialData, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFormData({ 
        ...formData, 
        mysql_file_url: URL.createObjectURL(file) 
      });
    }
  };

  const formatSiteUrl = (url: string, useHttps: boolean) => {
    // Remove protocol if it exists
    let formattedUrl = url.replace(/^https?:\/\//, '');
    // Remove trailing slashes
    formattedUrl = formattedUrl.replace(/\/+$/, '');
    // Add selected protocol
    return `${useHttps ? 'https://' : 'http://'}${formattedUrl}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('Form submission started');
    
    // Log the form data being submitted
    console.log('Form data being submitted:', {
      ...formData,
      // Don't log sensitive data in production
      drupal_password: formData.drupal_password ? '***' : 'not set'
    });

    if (!currentUser?.uid) { // Check for Firebase UID from prop
      const errorMsg = 'No authenticated Firebase user UID found. Please ensure you are logged in.';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (isLoading) {
      const errorMsg = 'Please wait while we initialize your session';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!isSupabaseConfigured()) {
      const errorMsg = 'Database configuration is missing. Please check your environment variables.';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      // Validate required fields
      if (!formData.site_name || !formData.site_url) {
        const errorMsg = 'Site name and URL are required';
        console.error(errorMsg);
        setError(errorMsg);
        return;
      }

      // Format the site URL before saving
      const formattedSite = {
        ...formData,
        site_url: formatSiteUrl(formData.site_url, useHttps)
      };

      // Log the formatted site data for debugging
      console.log('Formatted site data:', {
        ...formattedSite,
        drupal_password: formattedSite.drupal_password ? '***' : 'not set'
      });

      // Validate required fields
      const requiredFields = ['site_name', 'site_url', 'cms'];
      const missingFields = requiredFields.filter(field => !formattedSite[field]);
      
      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        console.error('Validation error:', errorMsg);
        setError(errorMsg);
        return;
      }

      // Ensure cms has required properties
      if (!formattedSite.cms || !formattedSite.cms.id || !formattedSite.cms.name) {
        const errorMsg = 'CMS information is incomplete';
        console.error('Validation error:', errorMsg, { cms: formattedSite.cms });
        setError(errorMsg);
        return;
      }

      const siteDataToSave = {
        user_id: currentUser.uid, // USE FIREBASE STRING UID HERE
        cms_id: formattedSite.cms.id,
        cms_version: formattedSite.cms.version, // Save the CMS version
        company_id: formattedSite.company_id,
        site_name: formattedSite.site_name.trim(),
        site_url: formattedSite.site_url,
        description: formattedSite.description, // Include description field
        mysql_file_url: formattedSite.mysql_file_url,
        status: initialData?.id ? formattedSite.status : 'pending', // Initial status for new sites
        migration_ids: formattedSite.migration_ids,
        tags: formattedSite.tags,
        is_active: formattedSite.is_active,
        // Include Drupal credentials if they exist
        ...(formattedSite.drupal_username && { drupal_username: formattedSite.drupal_username }),
        ...(formattedSite.drupal_password && { drupal_password: formattedSite.drupal_password }),
      };

      console.log('Preparing to save site data:', siteDataToSave);

      let result; 
      if (initialData?.id) {
        console.log('Updating existing site:', initialData.id, 'with data:', JSON.stringify(siteDataToSave, null, 2));
        
        try {
          const { data, error: updateError } = await supabase
            .from('sites')
            .update({
              ...siteDataToSave, 
              updated_at: new Date().toISOString()
            })
            .eq('id', initialData.id)
            .select()
            .single();

          if (updateError) {
            console.error('Update error details:', {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code,
              fullError: JSON.stringify(updateError, Object.getOwnPropertyNames(updateError))
            });
            
            // Try to get more details about the table structure
            try {
              const { data: tableInfo, error: tableError } = await supabase
                .rpc('get_table_info', { table_name: 'sites' });
                
              console.log('Table info:', tableInfo);
              console.log('Table error:', tableError);
            } catch (e) {
              console.error('Error getting table info:', e);
            }
            
            throw updateError;
          }
          result = data;
        } catch (error) {
          console.error('Error during site update:', {
            error,
            errorString: String(error),
            errorObj: JSON.stringify(error, Object.getOwnPropertyNames(error))
          });
          throw error;
        }
      } else {
        console.log('Creating new site with data:', JSON.stringify(siteDataToSave, null, 2));
      
      try {
        const { data, error: insertError } = await supabase
          .from('sites')
          .insert({
            ...siteDataToSave, 
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
            fullError: JSON.stringify(insertError, Object.getOwnPropertyNames(insertError))
          });
          
          // Try to get more details about the table structure
          try {
            const { data: tableInfo, error: tableError } = await supabase
              .rpc('get_table_info', { table_name: 'sites' });
              
            console.log('Table info:', tableInfo);
            console.log('Table error:', tableError);
            
            // Try to get the table structure using information_schema
            const { data: columns, error: columnsError } = await supabase
              .from('information_schema.columns')
              .select('column_name, data_type, is_nullable, column_default')
              .eq('table_name', 'sites');
              
            console.log('Table columns:', columns);
            console.log('Columns error:', columnsError);
            
          } catch (e) {
            console.error('Error getting table info:', e);
          }
          
          throw insertError;
        }
        result = data;
      } catch (error) {
        console.error('Error during site creation:', {
          error,
          errorString: String(error),
          errorObj: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        throw error;
      }
      }

      console.log('Supabase response after insert/update:', result);

      if (!result) {
        throw new Error('No data returned from database after site save/update');
      }
      
      let siteRecordForApp = { ...result };

      // If it's a new Drupal site, attempt to fetch structure and create schema
      if (!initialData?.id && siteRecordForApp.cms_id === 1 ) { 
        console.log(`New Drupal site created (ID: ${siteRecordForApp.id}). Attempting to create schema.`);
        let examplePayload = null;
        try {
          console.log(`Fetching Drupal structure from: ${siteRecordForApp.site_url}`);
          
          const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
          if (!apiBaseUrl) {
            console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
            setError("Application configuration error: API endpoint is missing for Drupal structure fetch.");
            // Potentially stop further execution or handle error appropriately
            // For now, we'll let it proceed and fail at the axios call if not caught by a general error handler
          }

          const structureResponse = await axios.get(
            `${apiBaseUrl}/drupal7/structure`,
            {
              params: {
                endpoint: siteRecordForApp.site_url,
              },
              timeout: 30000, 
            }
          );

          if (structureResponse.data && Array.isArray(structureResponse.data) && structureResponse.data.length > 0) {
            examplePayload = structureResponse.data[0];
            console.log('Successfully fetched example payload from Drupal structure (first item).');
          } else if (structureResponse.data && typeof structureResponse.data === 'object' && Object.keys(structureResponse.data).length > 0) {
            examplePayload = structureResponse.data;
            console.log('Drupal structure response was an object, using it as example payload.');
          } else {
            console.warn('No suitable example payload data returned from Drupal structure. Schema creation will be based on an empty object or may be skipped.');
          }
        } catch (fetchError) {
          const axiosError = axios.isAxiosError(fetchError) ? fetchError : null;
          const errorMessage = axiosError?.response?.data?.error || axiosError?.message || (fetchError instanceof Error ? fetchError.message : "Unknown error fetching structure");
          
          console.error("Failed to fetch Drupal site structure for schema creation:", {
            message: errorMessage,
            url: axiosError?.config?.url,
            status: axiosError?.response?.status,
            details: fetchError
          });
          setError(`Failed to fetch content from ${siteRecordForApp.site_url}. Schema not auto-created. (Error: ${errorMessage})`);
        }

        if (examplePayload) {
          const schemaDescription = `Auto-generated schema for ${siteRecordForApp.site_name}`;
          const schemaVersion = "1.0.0";
          try {
            console.log('Calling /createSchema with example payload...');
            
            // REACT_APP_API_BASE_URL should already be defined and checked from the previous block
            // If it wasn't, the earlier check would have (or should have) handled it.
            // Adding another check here for robustness in case the code flow changes or this block is called independently.
            const apiBaseUrlForSchema = process.env.REACT_APP_API_BASE_URL; 
            if (!apiBaseUrlForSchema) {
              console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined for schema creation.");
              setError("Application configuration error: API endpoint is missing for schema creation.");
              // Stop or handle error
              return; // Or throw new Error(...)
            }

            const schemaResponse = await axios.post(
              `${apiBaseUrlForSchema}/createSchema`,
              {
                site_id: siteRecordForApp.id,
                cms_id: siteRecordForApp.cms_id,
                example_payload: examplePayload,
                description: schemaDescription,
                version: schemaVersion,
                created_by: currentUser.uid, // USE FIREBASE STRING UID HERE for consistency, or keep supabaseUserId if your backend expects the integer ID for 'created_by'
              },
              { headers: { 'Content-Type': 'application/json' } }
            );

            if (schemaResponse.data.success && schemaResponse.data.schema && schemaResponse.data.schema.id) {
              const createdSchemaId = schemaResponse.data.schema.id;
              console.log("Schema created successfully, ID:", createdSchemaId);

              const { data: updatedSiteWithSchema, error: updateSiteError } = await supabase
                .from('sites')
                .update({ schema_id: createdSchemaId, status: 'active', updated_at: new Date().toISOString() })
                .eq('id', siteRecordForApp.id)
                .select()
                .single();

              if (updateSiteError) {
                console.error(`Failed to update site ${siteRecordForApp.id} with schema_id:`, updateSiteError);
                setError(`Schema was created (ID: ${createdSchemaId}) but failed to link it to the site. Please check site details.`);
              } else {
                console.log(`Site ${siteRecordForApp.id} updated with schema_id ${createdSchemaId} and status 'active'.`);
                siteRecordForApp = { ...siteRecordForApp, ...updatedSiteWithSchema }; // Update with latest from DB
              }
            } else {
              const schemaCreationError = schemaResponse.data.error || 'Unknown error during schema creation function execution.';
              console.error("Schema creation via /createSchema failed or returned no schema ID:", schemaCreationError);
              setError(`Schema creation failed: ${schemaCreationError}. Site created but schema needs manual attention.`);
            }
          } catch (schemaError) {
             const axiosSchemaError = axios.isAxiosError(schemaError) ? schemaError : null;
             const schemaErrorMessage = axiosSchemaError?.response?.data?.error || axiosSchemaError?.message || (schemaError instanceof Error ? schemaError.message : "Unknown error calling createSchema");
            console.error("Error calling /createSchema function:", {
                message: schemaErrorMessage,
                url: axiosSchemaError?.config?.url,
                status: axiosSchemaError?.response?.status,
                details: schemaError
            });
            setError(`Error during schema creation: ${schemaErrorMessage}. Site created but schema needs manual attention.`);
          }
        } else if (siteRecordForApp.cms_id === 1) { 
           console.warn("No example payload available for Drupal site, automatic schema creation skipped. Site status remains 'pending'.");
           if (!error) { 
             setError("Could not retrieve content structure from the Drupal site, so an automatic schema was not generated. The site is saved with 'pending' status.");
           }
        }
      }


      const savedSite: ISite = {
        id: siteRecordForApp.id,
        user_id: siteRecordForApp.user_id, // This will now be the string Firebase UID after the Supabase insert/update returns it
        cms: {
          id: siteRecordForApp.cms_id,
          name: CMS_OPTIONS.find(opt => opt.id === siteRecordForApp.cms_id)?.name || 'Unknown CMS',
          version: formattedSite.cms.version 
        },
        site_name: siteRecordForApp.site_name,
        site_url: siteRecordForApp.site_url,
        description: formattedSite.description, 
        mysql_file_url: siteRecordForApp.mysql_file_url,
        status: siteRecordForApp.status, 
        is_active: siteRecordForApp.is_active,
        company_id: siteRecordForApp.company_id,
        migration_ids: siteRecordForApp.migration_ids,
        tags: siteRecordForApp.tags,
        schema_id: siteRecordForApp.schema_id,
        created_at: siteRecordForApp.created_at,
        updated_at: siteRecordForApp.updated_at
      };

      console.log('Converted site data for onSave:', savedSite);
      
      onSave(savedSite); 
      
      if (!error) { 
        onClose();
      } else {
        console.log(`Form submission process completed with issues (see error message). Form remains open. Error: ${error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save site';
      console.error('Critical error in handleSubmit:', {
        message: errorMsg,
        errorDetails: error
      });
      setError(errorMsg);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove protocol if user tries to type it
    const value = e.target.value.replace(/^https?:\/\//, '');
    setFormData({ ...formData, site_url: value });
  };

  const toggleProtocol = () => {
    setUseHttps(!useHttps);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-[#2D3748] w-96 h-full p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Site' : 'Add New Site'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p>Initializing...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 text-center">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Site Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Site Name *</label>
              <input
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
                required
              />
            </div>

            {/* Site URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Site URL *</label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={toggleProtocol}
                  className="bg-[#1A202C] border border-gray-600 rounded-l-md px-3 py-2 text-sm"
                >
                  {useHttps ? 'https://' : 'http://'}
                </button>
                <input
                  type="text"
                  value={formData.site_url}
                  onChange={handleUrlChange}
                  placeholder="example.com"
                  className="flex-1 bg-[#1A202C] border-t border-b border-r border-gray-600 rounded-r-md p-2"
                  required
                />
              </div>
            </div>

            {/* CMS Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">CMS Type *</label>
              <select
                value={formData.cms.id} 
                onChange={(e) => {
                  const selectedId = parseInt(e.target.value, 10);
                  const selected = CMS_OPTIONS.find(opt => opt.id === selectedId) || CMS_OPTIONS[0];
                  setFormData({ ...formData, cms: selected });
                }}
                className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
                required
              >
                {CMS_OPTIONS.map((cms) => (
                  <option key={cms.id} value={cms.id}> 
                    {cms.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Version - Show based on selected CMS */}
            {['Drupal', 'WordPress', 'Joomla'].includes(formData.cms.name) && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {formData.cms.name} Version
                </label>
                <div className="flex flex-wrap gap-4">
                  {(
                    formData.cms.name === 'Drupal' 
                      ? [7, 8, 9, 10, 11]
                      : formData.cms.name === 'WordPress'
                      ? ['6.4', '6.3', '6.2', '6.1', '6.0']
                      : ['5.0', '4.3', '4.2', '4.1', '4.0']
                  ).map((version) => (
                    <label key={version} className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-indigo-600"
                        name={`${formData.cms.name.toLowerCase()}-version`}
                        value={version}
                        checked={formData.cms.version === version.toString()}
                        onChange={() => setFormData({
                          ...formData,
                          cms: { ...formData.cms, version: version.toString() }
                        })}
                      />
                      <span className="ml-2">{formData.cms.name} {version}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Drupal Admin Credentials - Only show for Drupal 11 */}
            {isDrupal11 && (
              <div className="mb-6 p-4 bg-gray-800 rounded-md border border-gray-700">
                <h3 className="text-sm font-medium mb-3 text-yellow-400">Drupal Admin Credentials</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      value={formData.drupal_username || 'admin'}
                      onChange={(e) => setFormData({ ...formData, drupal_username: e.target.value })}
                      className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
                      placeholder="admin"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Drupal admin username for API access
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Admin Password
                    </label>
                    <input
                      type="password"
                      value={formData.drupal_password || ''}
                      onChange={(e) => setFormData({ ...formData, drupal_password: e.target.value })}
                      className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
                      placeholder="••••••••"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Drupal admin password for API access
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Description <span className="text-gray-400 text-xs">(Max 100 chars)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={100}
                className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2 h-20"
              />
            </div>

            {/* MySQL File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">MySQL Database File</label>
              <div className="border-2 border-dashed border-gray-600 rounded-md p-6 text-center">
                <input
                  type="file"
                  id="mysql-upload"
                  accept=".sql,.gz"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="mysql-upload" className="cursor-pointer">
                  {formData.mysql_file_url ? (
                    <span className="text-green-400">File selected </span>
                  ) : (
                    <>
                      <p>Drag & drop SQL file here</p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {initialData ? 'Update Site' : 'Save Site'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewSiteForm;