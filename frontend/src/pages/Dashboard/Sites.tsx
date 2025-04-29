import NewSiteForm from '../../components/Sites/NewSiteForm';
import React, { useState } from 'react';
import { ISite } from '../../types/sites';
import axios from 'axios';

// Define the props interfaces for the content components
interface ContentPreviewProps {
  site: ISite;
  onClose: () => void;
}

interface ContentVectorizeProps {
  site: ISite;
  onClose: () => void;
  content?: any;
  onComplete?: (result: { objectsCreated: number; siteName: string }) => void;
  onError?: (error: Error) => void;
}


type VectorizeProps = ContentVectorizeProps;

// Dynamically import the components with type assertions
const ContentPreview = React.lazy(() =>
  import('../../components/Content/contentPreview')
    .then(module => ({ default: module.default as React.FC<ContentPreviewProps> }))
);

const ContentVectorize = React.lazy(() =>
  import('../../components/Content/contentVectorize').then(module => ({
    default: module.default as unknown as React.FC<ContentVectorizeProps>
  }))
);

// Plus icon SVG component
const PlusIcon = () => (
  <svg 
    className="w-4 h-4 mr-1" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
    />
  </svg>
);

// Helper functions
const getSiteIcon = (siteName: string): string => {
  const icons: Record<string, string> = {
    'drupal': 'icons/drupal7.png',
    'wordpress': '/icons/wordpress.png', 
    'joomla': '/icons/joomla.png',
  };
  return icons[siteName.toLowerCase()] || 'icons/drupal7.png';
};

const getSiteDisplayName = (siteName: string): string => {
  const displayNames: Record<string, string> = {
    'drupal': 'Drupal',
    'wordpress': 'WordPress',
    'joomla': 'Joomla',
  };
  return displayNames[siteName.toLowerCase()] || siteName;
};

interface SitesProps {
  sites: ISite[];
  onSiteAdded: (newSite: ISite) => void;
  onSiteUpdated: (updatedSite: ISite) => void;
  onAddChatMessage: (message: {
    text: string;
    type?: 'site' | 'vectorization';
    site?: {
      id: number;
      name: string;
      url: string;
      cms: string;
      description?: string;
    };
    vectorizationResults?: {
      objectsCreated: number;
      siteId: number;
    };
  }) => void;
  onSiteSelected: (siteId: number) => void;
}

const Sites: React.FC<SitesProps> = ({ 
  sites, 
  onSiteAdded, 
  onSiteUpdated,
  onAddChatMessage,
  onSiteSelected 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<ISite | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [showContentVectorize, setShowContentVectorize] = useState(false);
  const [vectorizeStatus, setVectorizeStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const handleSiteSelect = (siteId: number) => {
    setSelectedSiteId(siteId);
    onSiteSelected(siteId);
  };

  const handleEditClick = (site: ISite) => {
    setCurrentSite(site);
    setIsFormOpen(true);
  };

  const handleSave = (siteData: ISite) => {
    const isUpdate = !!currentSite;
    
    if (isUpdate) {
      onSiteUpdated({ ...currentSite, ...siteData });
    } else {
      onSiteAdded(siteData);
    }

    // Only send chat message if we have a valid site ID
    if (siteData.id && typeof siteData.id === 'number') {
      onAddChatMessage({
        text: `Site "${siteData.site_name}" has been ${isUpdate ? 'updated' : 'created'}`,
        site: {
          id: siteData.id,  // Use the actual ID from Supabase
          name: siteData.site_name,
          url: siteData.site_url,
          cms: siteData.cms.name,
          description: siteData.description
        }
      });
    }

    setIsFormOpen(false);
    setCurrentSite(null);
  };

  const createSchema = async (site: ISite) => {
    try {
      console.log('Creating schema for site:', {
        id: site.id,
        name: site.site_name,
        cms: site.cms,
        full_site: site
      });
      
      // Validate site ID
      if (!site.id || typeof site.id !== 'number') {
        throw new Error(`Invalid site ID: ${site.id}. Site might not be properly saved in the database.`);
      }

      // Example payload based on WordPress/Drupal common content structure
      const examplePayload = {
        title: "Sample Content",
        content: "Main content body text",
        excerpt: "Short description",
        author: {
          id: 1,
          name: "Author Name",
          email: "author@example.com"
        },
        status: "published",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: {
          seo_title: "SEO Title",
          seo_description: "SEO Description",
          keywords: ["keyword1", "keyword2"]
        },
        categories: ["category1", "category2"],
        tags: ["tag1", "tag2"]
      };

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const endpoint = `${apiUrl}/intelligensi-ai-v2/us-central1/createSchema`;
      
      console.log('Making request to:', endpoint);
      const requestPayload = {
        site_id: site.id,
        schema_name: "content",
        example_payload: examplePayload
      };
      console.log('Request payload:', requestPayload);

      const response = await axios.post(
        endpoint,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Schema creation response:', response.data);

      if (response.data.success) {
        console.log('Schema created/updated successfully:', response.data);
        return true;
      } else {
        const errorMsg = response.data.error || 'Failed to create schema';
        console.error('Schema creation failed:', errorMsg);
        setSchemaError(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Schema creation error:', error);
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.message;
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        setSchemaError(`Schema creation failed: ${errorMsg}`);
      } else {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Non-Axios error:', errorMsg);
        setSchemaError(errorMsg);
      }
      return false;
    }
  };

  const handleVectorizeClick = async (site: ISite) => {
    if (!site || !site.id || typeof site.id !== 'number' || site.id > 1000000) {
      setSchemaError('Invalid site ID. Please ensure the site is properly saved in the database.');
      console.error('Invalid site data:', site);
      return;
    }

    console.log('Starting vectorization for site:', {
      id: site.id,
      name: site.site_name,
      cms: site.cms.name
    });
    setVectorizeStatus('processing');
    setSchemaError(null);

    try {
      // First create/update the schema
      const schemaCreated = await createSchema(site);
      console.log('Schema creation result:', schemaCreated);
      
      if (!schemaCreated) {
        console.error('Schema creation failed');
        setVectorizeStatus('error');
        return;
      }

      // If schema is created successfully, proceed with vectorization
      setShowContentVectorize(true);
    } catch (error) {
      console.error('Vectorization error:', error);
      setVectorizeStatus('error');
      setSchemaError(error instanceof Error ? error.message : 'An error occurred during vectorization');
    }
  };

  const handleVectorizeComplete = (result: { objectsCreated: number; siteName: string }) => {
    setVectorizeStatus('complete');
    if (selectedSiteId) {
      const selectedSite = sites.find(s => s.id === selectedSiteId);
      onAddChatMessage({
        text: `${result.objectsCreated} objects have been vectorized`,
        type: 'vectorization',
        site: {
          id: selectedSiteId,
          name: selectedSite?.site_name || '',
          url: selectedSite?.site_url || '',
          cms: selectedSite?.cms.name || '',
          description: `${result.objectsCreated} objects were successfully vectorized and are now ready for use with AI.`
        },
        vectorizationResults: {
          objectsCreated: result.objectsCreated,
          siteId: selectedSiteId
        }
      });
    }
    setTimeout(() => setShowContentVectorize(false), 1500);
  };

  const handleVectorizeError = (error: Error) => {
    setVectorizeStatus('error');
    console.error('Vectorization error:', error);
    // Optionally show error to user
  };

  // Get the selected site
  const selectedSite = sites.find(s => s.id === selectedSiteId);

  return (
    <div className="bg-[#2D3748] p-4 border-t border-gray-700 relative">
      {/* New Site Button */}
      <button 
        onClick={() => {
          setCurrentSite(null);
          setIsFormOpen(true);
        }}
        className="absolute top-4 left-4 px-4 py-5 border-teal-200 border-2 font-extrabold bg-teal-500 hover:bg-teal-400 text-white rounded-md text-1xl flex items-center transition-colors duration-200 shadow-md"
      >
        <PlusIcon />
        <span>Connect CMS</span>
      </button>

      {/* Sites Display */}
      <div className="flex pl-40 bg-[#2D3748]"> 
        <div className="flex overflow-x-auto flex-1 bg-[#344054] py-3 rounded-lg ml-4 border border-gray-600 shadow-sm">
          {sites.length === 0 ? (
            <div className="flex flex-1 justify-center px-2 text-gray-400 italic font-bold items-center">
              No sites connected
            </div>
          ) : (
            sites.map((site) => (
              <div 
                key={site.id} 
                className="flex py-1 flex-col items-center min-w-[90px] group cursor-pointer"
                onClick={() => handleSiteSelect(site.id!)}
              >
                <div 
                  className={`relative p-1 rounded-lg transition-all duration-200 ${
                    selectedSiteId === site.id ? 'ring-2 ring-teal-400' : ''
                  }`}
                  onDoubleClick={() => handleEditClick(site)}
                >
                  <img 
                    src={getSiteIcon(site.cms.name)} 
                    alt={`${site.cms.name} Logo`}
                    className="w-15 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
                  />
                </div>
                <span className={`text-xs mt-1 font-bold transition-colors ${
                  selectedSiteId === site.id ? 'text-teal-400' : 'text-gray-300 group-hover:text-white'
                }`}>
                  {getSiteDisplayName(site.cms.name)}
                </span>
              </div>
            ))
          )}
        </div>
        
        {/* Connected Sites */}
        <div className="bg-[#2D3748] px-4 py-2 rounded-lg ml-4 border border-gray-600 shadow-sm min-w-[200px]">
          <h3 className="font-semibold mb-1 text-gray-100">Connected Sites</h3>
          <div className="text-sm text-teal-400 font-medium">
            {sites.length} site{sites.length !== 1 ? 's' : ''} connected
          </div>
          {selectedSite && (
            <div className="mt-3 space-y-2">
              <button 
                onClick={() => setShowContentPreview(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
              >
                Preview Content
              </button>
              <button 
                onClick={() => console.log('Migrate site', selectedSite.id)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
              >
                Migrate
              </button>
              <button 
                onClick={() => handleVectorizeClick(selectedSite)}
                className={`w-full ${
                  vectorizeStatus === 'processing' 
                    ? 'bg-yellow-600' 
                    : vectorizeStatus === 'error' 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-green-600 hover:bg-green-500'
                } text-white py-1 px-3 rounded text-sm font-medium transition-colors`}
                disabled={vectorizeStatus === 'processing'}
              >
                {vectorizeStatus === 'processing' 
                  ? 'Processing...' 
                  : vectorizeStatus === 'error' 
                  ? 'Retry Vectorize' 
                  : 'Vectorize'}
              </button>

              {/* Site details */}
              <div className="mt-4 text-sm text-gray-300">
                <p><span className="text-gray-400">Name:</span> {selectedSite.site_name}</p>
                <p><span className="text-gray-400">CMS:</span> {selectedSite.cms.name}</p>
                {selectedSite.description && (
                  <p><span className="text-gray-400">Description:</span> {selectedSite.description}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Site Form */}
      <NewSiteForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={currentSite}
      />

      {/* Content Preview Modal */}
      {showContentPreview && selectedSite && (
        <React.Suspense fallback={<div>Loading preview...</div>}>
          <ContentPreview 
            site={selectedSite}
            onClose={() => setShowContentPreview(false)}
          />
        </React.Suspense>
      )}

      {/* Content Vectorize Modal */}
      {showContentVectorize && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D3748] rounded-lg p-6 w-full max-w-4xl">
            <ContentVectorize
              site={selectedSite}
              onClose={() => setShowContentVectorize(false)}
              onComplete={handleVectorizeComplete}
              onError={handleVectorizeError}
            />
          </div>
        </div>
      )}

      {/* Add error message display */}
      {schemaError && (
        <div className="mt-2 text-red-500 text-sm">
          {schemaError}
        </div>
      )}
    </div>
  );
};

export default Sites;