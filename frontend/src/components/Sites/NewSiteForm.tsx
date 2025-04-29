import React, { useState, useEffect } from 'react';
import { ISite, ICMS } from '../../types/sites';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { getAuth } from 'firebase/auth';

interface NewSiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: ISite) => void;
  initialData?: ISite | null;
}

const CMS_OPTIONS: ICMS[] = [
  { id: 1, name: 'Drupal', version: '' },
  { id: 2, name: 'WordPress', version: '' },
  { id: 3, name: 'Joomla', version: '' },
];

const NewSiteForm: React.FC<NewSiteFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<ISite>({
    user_id: 0,
    cms: CMS_OPTIONS[0],
    site_name: '',
    site_url: '',
    description: '',
    mysql_file_url: undefined,
    status: 'active',
    is_active: true,
    company_id: undefined,
    migration_ids: undefined,
    tags: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error in user initialization:', {
          error,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
        setError(`Failed to initialize user: ${errorMessage}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('Form submission started');

    if (isLoading) {
      const errorMsg = 'Please wait while we initialize your session';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!supabaseUserId) {
      const errorMsg = 'No valid user ID found. Please try refreshing the page.';
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

      // Clean up URL
      let siteUrl = formData.site_url.trim();
      if (siteUrl.startsWith('http://') || siteUrl.startsWith('https://')) {
        siteUrl = siteUrl.split('://')[1];
      }
      siteUrl = `${useHttps ? 'https://' : 'http://'}${siteUrl}`;

      // Prepare the site data with the Supabase user ID
      const siteData = {
        user_id: supabaseUserId,
        cms_id: formData.cms.id,
        company_id: null,
        site_name: formData.site_name.trim(),
        site_url: siteUrl,
        mysql_file_url: formData.mysql_file_url,
        status: 'pending',
        migration_ids: null,
        tags: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Preparing to save site data:', siteData);

      let result;
      if (initialData?.id) {
        console.log('Updating existing site:', initialData.id);
        const { data, error: updateError } = await supabase
          .from('sites')
          .update(siteData)
          .eq('id', initialData.id)
          .select()
          .single();

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        result = data;
      } else {
        console.log('Creating new site');
        const { data, error: insertError } = await supabase
          .from('sites')
          .insert(siteData)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        result = data;
      }

      console.log('Supabase response:', result);

      if (!result) {
        throw new Error('No data returned from database');
      }

      // Convert the Supabase result to ISite format
      const savedSite: ISite = {
        id: result.id,
        user_id: result.user_id,
        cms: {
          id: result.cms_id,
          name: formData.cms.name,
          version: formData.cms.version
        },
        site_name: result.site_name,
        site_url: result.site_url,  // Use the new site_url column
        description: '',  // Not in DB, using empty string
        mysql_file_url: result.mysql_file_url,  // Keep mysql_file_url for database files
        status: result.status,
        is_active: result.is_active,
        company_id: result.company_id,
        migration_ids: result.migration_ids,
        tags: result.tags,
        created_at: result.created_at,
        updated_at: result.updated_at
      };

      console.log('Converted site data:', savedSite);
      
      // Call onSave with the new site data
      onSave(savedSite);
      
      // Close the form
      console.log('Form submission successful, closing form');
      onClose();
    } catch (error) {
      console.error('Error saving site:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save site';
      console.error('Error message:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove protocol if user types it (we'll handle it with our toggle)
    if (value.startsWith('http://') || value.startsWith('https://')) {
      value = value.split('://')[1] || '';
    }
    
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

            {/* Rest of the form remains the same */}
            {/* CMS Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">CMS Type *</label>
              <select
                value={formData.cms.name}
                onChange={(e) => {
                  const selected = CMS_OPTIONS.find(opt => opt.name === e.target.value) || CMS_OPTIONS[0];
                  setFormData({ ...formData, cms: selected });
                }}
                className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
                required
              >
                {CMS_OPTIONS.map((cms) => (
                  <option key={cms.id} value={cms.name}>
                    {cms.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Version */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Version</label>
              <input
                type="text"
                value={formData.cms.version || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  cms: { ...formData.cms, version: e.target.value } 
                })}
                placeholder="e.g. 7.0, 5.8.2"
                className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
              />
            </div>

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
                    <span className="text-green-400">File selected ✓</span>
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