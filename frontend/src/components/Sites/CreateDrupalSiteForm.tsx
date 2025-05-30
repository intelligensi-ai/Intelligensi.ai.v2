import React, { useState } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { toast } from 'react-toastify';

interface DrupalSiteData {
  id?: string | number;
  siteName?: string;
  name?: string;
  url?: string;
  siteUrl?: string;
  // Add any other properties that might be returned by the createDrupalSite function
}

interface CreateDrupalSiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
  onAddChatMessage?: (message: any) => void;
}

const CreateDrupalSiteForm: React.FC<CreateDrupalSiteFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAddChatMessage
}) => {
  const [siteName, setSiteName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!siteName.trim()) {
      setError('Site name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const createDrupalSite = httpsCallable<{ customName: string }, DrupalSiteData>(
        functions, 
        'createDrupalSite'
      );
      
      const result = await createDrupalSite({
        customName: siteName.trim()
      });
      
      console.log('Create Drupal Site result:', result.data);
      
      const siteData = result.data;
      const siteNameDisplay = siteData.siteName || siteData.name || 'New Drupal Site';
      const siteId = siteData.id || Date.now();
      const siteUrl = siteData.url || siteData.siteUrl || '#';
      
      toast.success('Drupal site creation initiated successfully!');
      
      // Add chat message with site details
      if (onAddChatMessage) {
        const siteIdNum = typeof siteId === 'string' ? parseInt(siteId, 10) : siteId;
        onAddChatMessage({
          id: Date.now().toString(),
          text: `Drupal site "${siteNameDisplay}" has been created`,
          sender: 'assistant',
          status: 'sent',
          timestamp: new Date(),
          site: {
            id: siteIdNum,
            site_name: siteNameDisplay,
            site_url: siteUrl,
            cms: {
              id: 1, // Assuming 1 is the ID for Drupal in your CMS table
              name: 'Drupal',
              user_id: '' // This will be filled in by the Dashboard component
            },
            description: 'New Drupal site',
            schema_id: null
          }
        });
      }
      
      if (onSuccess) {
        onSuccess(siteData);
      }
      
      onClose();
    } catch (err) {
      console.error('Error creating Drupal site:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Drupal site');
      toast.error('Failed to create Drupal site');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 pt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Drupal Site</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="siteName" className="block text-sm font-medium text-gray-300 mb-1">
              Site Name
            </label>
            <input
              type="text"
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter site name"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">
              This will be used as part of your site's URL
            </p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-900 text-white rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Site'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDrupalSiteForm;
