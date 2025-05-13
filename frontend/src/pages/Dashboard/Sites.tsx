import ConfirmationModal from '../../components/ConfirmationModal';
import NewSiteForm from '../../components/Sites/NewSiteForm';
import React, { useState, useEffect } from 'react';
import { ISite } from '../../types/sites';
import { User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, functions } from '../../firebase'; // Restore app and functions import
// import { auth } from '../../firebase'; // Keep auth commented/removed

import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
  onSiteDeleted?: (siteId: number) => void; // Add optional delete handler
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
      siteId: number | null;
    };
  }) => void;
  onSiteSelected: (siteId: number) => void;
  currentUser: User | null; // Add currentUser to SitesProps
  selectedSiteId?: number | null;
  userId?: string;
}

const Sites: React.FC<SitesProps> = ({ 
  sites,
  onSiteAdded,
  onSiteUpdated,
  onSiteDeleted,
  onAddChatMessage,
  onSiteSelected,
  currentUser,
  selectedSiteId: propSelectedSiteId,
  userId: propUserId,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sitesInput, setSitesInput] = useState<ISite[]>(sites || []);

  // Update sitesInput when sites prop changes
  useEffect(() => {
    setSitesInput(sites || []);
  }, [sites]);
  // Removed duplicate selectedSite state
  const [currentSite, setCurrentSite] = useState<ISite | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(propSelectedSiteId || null);
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [showContentVectorize, setShowContentVectorize] = useState(false);
  const [vectorizeStatus, setVectorizeStatus] = useState<'processing' | 'complete' | 'error' | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // State for remove confirmation modal
  const [isRemoveConfirmModalOpen, setIsRemoveConfirmModalOpen] = useState(false);
  const [sitePendingRemoval, setSitePendingRemoval] = useState<ISite | null>(null);

  // Define functions instance and callable function once on component mount
  const callDeleteSite = httpsCallable(functions, 'deleteSite'); 


  const handleSiteSelect = (siteId: number) => {
    if (selectedSiteId === siteId) {
      // If the clicked site is already selected, deselect it
      setSelectedSiteId(null);
      onSiteSelected(null as any); // Pass null, or handle this in DashboardPage if needed
    } else {
      // Otherwise, select the new site
      setSelectedSiteId(siteId);
      onSiteSelected(siteId);
    }
  };


  // Step 1: Initiate removal confirmation
  const handleAttemptRemoveSite = (site: ISite) => {
    setSitePendingRemoval(site);
    setIsRemoveConfirmModalOpen(true);
  };

  // Step 2: Execute removal after confirmation
  const executeSiteRemoval = async () => {
    console.log("Attempting to execute site removal...");
    if (!sitePendingRemoval) {
      console.error("executeSiteRemoval called with no sitePendingRemoval.");
      return; 
    }

    const siteToRemove = sitePendingRemoval;
    console.log(`Site to remove: ${siteToRemove.site_name} (ID: ${siteToRemove.id})`);

    setIsRemoveConfirmModalOpen(false); 
    setSitePendingRemoval(null);

    try {
      console.log("Calling Firebase function 'deleteSite' (using top-level instance)..."); // Log before call
      const result = await callDeleteSite({ siteId: siteToRemove.id }); 
      console.log('Firebase function result:', result.data);

      if ((result.data as any).success) {
        console.log("Site removal successful according to backend.");
        // Call onSiteDeleted prop to update parent state if it exists
        if (onSiteDeleted) {
          console.log("Calling onSiteDeleted prop...");
          onSiteDeleted(siteToRemove.id);
        }

        // Reset selected site if the removed site was selected
        if (selectedSiteId === siteToRemove.id) {
          console.log("Resetting selectedSiteId...");
          setSelectedSiteId(null);
          if (onSiteSelected) {
            onSiteSelected(null as any); // Or pass a more specific null/undefined marker if your handler expects it
          }
        }

        // Remove the site from local sitesInput state
        console.log("Updating local sitesInput state...");
        setSitesInput(prevSites => prevSites.filter(s => s.id !== siteToRemove.id));

        // Add a chat message about site removal
        if (onAddChatMessage) {
          console.log("Adding chat message...");
          onAddChatMessage({
            text: `Successfully removed site: ${siteToRemove.site_name}`,
            type: 'site', 
          });
        }
      } else {
        // Handle function error (e.g., show a message to the user)
        console.error("Firebase function reported failure:", (result.data as any).message);
        if (onAddChatMessage) {
          onAddChatMessage({
            text: `Error removing site ${siteToRemove.site_name}: ${(result.data as any).message}`,
            type: 'site',
          });
        }
      }
    } catch (error) {
      console.error("Error calling remove site function (catch block):", error);
      // Handle network or other errors (e.g., show a message to the user)
      if (onAddChatMessage) {
        onAddChatMessage({
          text: `Error removing site ${siteToRemove.site_name}. Please try again.`,
          type: 'site',
        });
      }
    } 
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

  const handleVectorizeClick = async (site: ISite) => {
    if (!site || !site.id || typeof site.id !== "number" || site.id > 1000000) {
      setSchemaError("Invalid site ID. Please ensure the site is properly saved in the database.");
      console.error("Invalid site data:", site);
      return;
    }
    // Ensure site.schema_id exists, otherwise schema is not yet created.
    if (!site.schema_id) {
        setSchemaError(`The site "${site.site_name}" does not have an associated schema. Vectorization cannot proceed. Please ensure a schema was created when the site was added or try re-adding the site if it's a Drupal site.`);
        console.warn(`Vectorization attempt for site "${site.site_name}" (ID: ${site.id}) which has no schema_id.`);
        setVectorizeStatus('error'); // Set status to error as we can't proceed
        return;
    }

    console.log("Starting vectorization for site:", {
      id: site.id,
      name: site.site_name,
      cms: site.cms.name,
      schema_id: site.schema_id
    });
    setVectorizeStatus("processing");
    setSchemaError(null); // Clear previous schema errors

    try {
      // Schema is now assumed to be created when the site was added.
      // No longer calling local createSchema function.
      console.log(`Proceeding with vectorization for site ${site.id} as schema_id ${site.schema_id} exists.`);
      setShowContentVectorize(true); // Directly proceed to vectorization UI

    } catch (error) { // This catch block might be for other errors during setup, not schema creation itself
      console.error("Error in vectorize click handler (before showing vectorize component):", error);
      setVectorizeStatus("error");
      setSchemaError(error instanceof Error ? error.message : "An unexpected error occurred before vectorization.");
    }
  };

  const handleVectorizeComplete = (result: { objectsCreated: number; siteName: string }) => {
    console.log(`Vectorization complete for ${result.siteName}: ${result.objectsCreated} objects created`);
    setShowContentVectorize(false);
    setVectorizeStatus('complete');
    if (selectedSiteId) {
      const vectorizedSite = sitesInput.find(s => s.id === selectedSiteId);
      onAddChatMessage({
        text: `${result.objectsCreated} objects have been vectorized`,
        type: 'vectorization',
        site: vectorizedSite ? {
          id: vectorizedSite.id,
          name: vectorizedSite.site_name,
          url: vectorizedSite.site_url,
          cms: vectorizedSite.cms.name,
          description: vectorizedSite.description
        } : undefined,
        vectorizationResults: {
          objectsCreated: result.objectsCreated,
          siteId: selectedSiteId
        }
      });
    }
  };

  const handleVectorizeError = (error: Error) => {
    setVectorizeStatus('error');
    console.error('Vectorization error:', error);
    // Optionally show error to user
  };

  // Get the selected site
  const selectedSite = sitesInput.find(s => s.id === selectedSiteId);

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
          {sitesInput.length === 0 ? (
            <div className="flex flex-1 justify-center px-2 text-gray-400 italic font-bold items-center">
              No sites connected
            </div>
          ) : (
            sitesInput.map((site) => (
              <div 
                key={site.id} 
                className={`flex py-1 flex-col items-center min-w-[90px] group cursor-pointer ${selectedSiteId === site.id ? 'rounded-lg' : ''}`}
                onClick={() => handleSiteSelect(site.id)}
                onDoubleClick={() => handleSiteSelect(site.id)}
              >
                <div 
                  className={`relative p-1 rounded-lg transition-all duration-200 border-2 border-transparent`}
                >
                  <img 
                    src={getSiteIcon(site.cms.name)} 
                    alt={`${site.cms.name} icon`}
                    className={`w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-200 ${selectedSiteId === site.id ? 'drop-shadow-[0_0px_8px_rgba(50,205,205,0.7)]' : ''}`}
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
            {sitesInput.length} site{sitesInput.length !== 1 ? 's' : ''} connected
          </div>
          {selectedSite && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
              <button 
                onClick={() => setShowContentPreview(true)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
              >
                Preview Content
              </button>
              <button 
                onClick={() => handleVectorizeClick(selectedSite)}
                className={`w-full ${
                  vectorizeStatus === 'processing' 
                    ? 'bg-yellow-600' 
                    : vectorizeStatus === 'complete' 
                    ? 'bg-green-600' 
                    : vectorizeStatus === 'error' 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-teal-600 hover:bg-teal-700'
                } text-white py-1 px-3 rounded text-sm font-medium transition-colors`}
                disabled={vectorizeStatus === 'processing'}
              >
                {vectorizeStatus === 'processing' && (
                  <div className="text-yellow-500 flex items-center">
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </div>
                )}
                {vectorizeStatus === 'complete' && (
                  <div className="text--600 flex items-center">
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Vectorization Complete
                  </div>
                )}
                {vectorizeStatus === 'error' && (
                  <div className="text-red-500 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                    Vectorization Failed
                  </div>
                )}
                {vectorizeStatus !== 'processing' && vectorizeStatus !== 'complete' && vectorizeStatus !== 'error' && (
                  <div>
                    Add to AI Database
                  </div>
                )}
              </button>
              <button 
                onClick={() => console.log('AI Prompt button clicked for site ID:', selectedSite.id)}
                className="w-full bg-teal-800 hover:bg-teal-900 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
              >
                AI Prompt
              </button>
              <button 
                className="w-full bg-teal-800 hover:bg-teal-900 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
              >
                Migrate
              </button>
              <button 
                onClick={() => {
                  const siteToDel = sitesInput.find(s => s.id === selectedSiteId);
                  if (siteToDel) handleAttemptRemoveSite(siteToDel);
                }}
                className="w-full bg-red-800 hover:bg-red-900 text-white py-1 px-3 rounded text-sm font-medium transition-colors mt-2"
              >
                Remove Site
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600 text-sm">
              <p><span className="font-semibold text-gray-400 mr-2">Name:</span> <span className="text-gray-200">{selectedSite.site_name}</span></p>
              <p><span className="font-semibold text-gray-400 mr-2">CMS:</span> <span className="text-gray-200">{selectedSite.cms.name}</span></p>
              {selectedSite.description && (
                <p><span className="font-semibold text-gray-400 mr-2">Description:</span> <span className="text-gray-200">{selectedSite.description}</span></p>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Site Form */}
      <NewSiteForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={currentSite}
        currentUser={currentUser} // Pass currentUser to NewSiteForm
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

      {/* Confirmation Modal for Removal */}
      <ConfirmationModal
        isOpen={isRemoveConfirmModalOpen}
        onClose={() => setIsRemoveConfirmModalOpen(false)}
        onConfirm={executeSiteRemoval}
        title="Confirm Site Removal"
        messageBody={<>Are you sure you want to remove the site: <strong>{sitePendingRemoval?.site_name}</strong>?</>}
        confirmButtonText="Remove"
        cancelButtonText="Cancel"
      />

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