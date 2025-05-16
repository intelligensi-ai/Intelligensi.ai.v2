import NewSiteForm from '../../components/Sites/NewSiteForm';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CreateDrupalSiteForm from '../../components/Sites/CreateDrupalSiteForm';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, BoltIcon } from '@heroicons/react/24/outline';
import axios from "axios";
import { User } from "firebase/auth";
import { ISite, ICMS } from "../../types/sites";
import { getSiteIcon, getSiteDisplayName } from '../../utils/siteHelpers';

// Dynamic imports for components that might not be used immediately
const ContentPreview = React.lazy(() => import('../../components/Content/contentPreview'));
const Vectorize = React.lazy(() => import('../../components/Content/contentVectorize'));

interface SitesProps {
  sites: ISite[];
  onSiteSelected: (siteId: number | null) => void;
  onSiteRemoved?: (siteId: number) => void;
  onSiteAdded: (newSite: ISite) => void;
  onSiteUpdated: (updatedSite: ISite) => void;
  selectedSiteId?: number | null; // Made optional
  userId?: string | null;          // Made optional
  currentUser: User | null;
  onAddChatMessage?: (message: any) => void;
}

const Sites: React.FC<SitesProps> = ({ 
  sites: sitesInput, 
  onSiteSelected, 
  onSiteAdded, 
  onSiteUpdated,
  onSiteRemoved,
  selectedSiteId, 
  userId,
  currentUser,
  onAddChatMessage 
}) => {
  const [sites, setSites] = useState<ISite[]>(sitesInput);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<ISite | null>(null);
  const [selectedSiteIdState, setSelectedSiteIdState] = useState<number | null>(selectedSiteId);
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [showContentVectorize, setShowContentVectorize] = useState(false);
  const [vectorizeStatus, setVectorizeStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState<boolean>(false);
  const [siteToRemove, setSiteToRemove] = useState<ISite | null>(null);
  const [isRemovingSite, setIsRemovingSite] = useState<boolean>(false);
  const [removeSiteError, setRemoveSiteError] = useState<string | null>(null);
  const [showCreateDrupalSiteForm, setShowCreateDrupalSiteForm] = useState(false);
  
  // Derive selectedSite from selectedSiteIdState
  const selectedSite = sites.find(site => site.id === selectedSiteIdState) || null;

  const handleSiteClick = (site: ISite) => {
    onSiteSelected(site.id);
  };

  const handleSiteDoubleClick = (site: ISite) => {
    setCurrentSite(site);
    setIsFormOpen(true);
  };
  // Interface for vectorization result
  interface VectorizeResult {
    objectsCreated: number;
    siteName: string;
  }

  // State for remove confirmation - moved to top with other state declarations

  useEffect(() => {
    setSites(sitesInput);
  }, [sitesInput]);
  
  // Function to refresh sites list
  const fetchSites = useCallback(() => {
    // In a real implementation, this would make an API call
    // For now, we'll just use the existing sites input
    setSites(sitesInput);
  }, [sitesInput]); 

  const handleSiteSelect = useCallback((siteId: number) => {
    if (selectedSiteIdState === siteId) {
      setSelectedSiteIdState(null);
      onSiteSelected(null);
    } else {
      setSelectedSiteIdState(siteId);
      onSiteSelected(siteId);
    }
  }, [selectedSiteIdState, onSiteSelected]);

  const handlePreviewClose = useCallback(() => {
    setShowContentPreview(false);
  }, []);



  const handleEditClick = (site: ISite) => {
    setCurrentSite(site);
    setIsFormOpen(true);
  };

  const handleSave = async (siteData: ISite) => {
    try {
      const isUpdate = !!currentSite;
      
      // If it's an update, merge with existing data to preserve any fields not in the form
      const updatedSite = isUpdate 
        ? { ...currentSite, ...siteData }
        : siteData;

      // Call the appropriate callback
      if (isUpdate) {
        onSiteUpdated(updatedSite);
        toast.success('Site updated successfully');
      } else {
        onSiteAdded(updatedSite);
        toast.success('Site added successfully');
      }

      // If we have a valid ID, select the site
      if (updatedSite.id && typeof updatedSite.id === 'number') {
        onSiteSelected(updatedSite.id);
      }

      // Close the form and reset
      setIsFormOpen(false);
      setCurrentSite(null);
    } catch (error) {
      console.error('Error saving site:', error);
      toast.error(`Failed to save site: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleVectorizeClick = async (site: ISite) => {
    if (!site || !site.id || typeof site.id !== "number" || site.id > 1000000) {
      setSchemaError("Invalid site ID. Please ensure the site is properly saved in the database.");
      console.error("Invalid site data:", site);
      return;
    }
    if (!site.schema_id) {
        setSchemaError(`The site "${site.site_name}" does not have an associated schema. Vectorization cannot proceed. Please ensure a schema was created when the site was added or try re-adding the site if it's a Drupal site.`);
        console.warn(`Vectorization attempt for site "${site.site_name}" (ID: ${site.id}) which has no schema_id.`);
        setVectorizeStatus('error'); 
        return;
    }

    console.log("Starting vectorization for site:", {
      id: site.id,
      name: site.site_name,
      cms: site.cms.name,
      schema_id: site.schema_id
    });
    setVectorizeStatus("processing");
    setSchemaError(null); 

    try {
      console.log(`Proceeding with vectorization for site ${site.id} as schema_id ${site.schema_id} exists.`);
      setShowContentVectorize(true); 

    } catch (error) { 
      console.error("Error in vectorize click handler (before showing vectorize component):", error);
      setVectorizeStatus("error");
      setSchemaError(error instanceof Error ? error.message : "An unexpected error occurred before vectorization.");
    }
  };

  const handleVectorizeComplete = (result: VectorizeResult) => {
    setVectorizeStatus('complete');
    if (selectedSiteIdState) {
      const selectedSite = sites.find(s => s.id === selectedSiteIdState);
      onSiteSelected(selectedSiteIdState);
    }
    setTimeout(() => setShowContentVectorize(false), 1500);
  };

  const handleVectorizeError = useCallback((error: string | Error) => {
    setVectorizeStatus('error');
    const errorMessage = typeof error === 'string' ? error : error.message;
    console.error('Vectorization error:', errorMessage);
    toast.error(`Vectorization failed: ${errorMessage}`);
  }, []);

  const handleOpenRemoveModal = (site: ISite) => {
    setSiteToRemove(site);
    setShowRemoveConfirmModal(true);
    setRemoveSiteError(null); 
  };

  const handleCloseRemoveModal = () => {
    setShowRemoveConfirmModal(false);
    setSiteToRemove(null);
    setIsRemovingSite(false);
    setRemoveSiteError(null);
  };

  const handleConfirmRemoveSite = async () => {
    if (!siteToRemove) return;

    setIsRemovingSite(true);
    setRemoveSiteError(null);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
        setRemoveSiteError("Configuration error. Please contact support."); 
        setIsRemovingSite(false);
        return;
      }

      console.log(`Attempting to delete site with ID: ${siteToRemove.id} via ${apiBaseUrl}/deleteSite`);

      const response = await axios.post(`${apiBaseUrl}/deleteSite`, {
        siteId: siteToRemove.id,
      });

      if (response.data.success) {
        console.log(`Site ${siteToRemove.id} successfully deleted from backend.`);
        setSites(prevSites => prevSites.filter(s => s.id !== siteToRemove.id));

        if (selectedSiteIdState === siteToRemove.id) {
          onSiteSelected(null);
          setSelectedSiteIdState(null); 
        }

        onSiteRemoved?.(siteToRemove.id);
        
        handleCloseRemoveModal();
        console.log("Site removal UI updated and modal closed.");
      } else {
        console.error("Backend failed to delete site:", response.data.error);
        throw new Error(response.data.error || "Failed to delete site from server.");
      }

    } catch (error: any) {
      console.error("Error during site removal process:", error);
      if (axios.isAxiosError(error) && error.response) {
        setRemoveSiteError(error.response.data?.error || error.message || "Failed to remove site. Please try again.");
      } else {
        setRemoveSiteError(error.message || "Failed to remove site. Please try again.");
      }
    } finally {
      setIsRemovingSite(false);
      console.log("Finished site removal attempt.");
    }
  };

  return (
    <div className="bg-[#2D3748] p-4 border-t border-gray-700 relative">
      <button 
        onClick={() => {
          setCurrentSite(null);
          setIsFormOpen(true);
        }}
        className="absolute top-4 left-4 px-4 py-5 border-teal-200 border-2 font-extrabold bg-teal-500 hover:bg-teal-400 text-white rounded-md text-1xl flex items-center transition-colors duration-200 shadow-md"
      >
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
        <span>Connect CMS</span>
      </button>

      <div className="flex pl-40 bg-[#2D3748]"> 
        <div className="flex overflow-x-auto flex-1 bg-[#344054] py-3 rounded-lg ml-4 border border-gray-600 shadow-sm">
          {sites.length === 0 ? (
            <div className="flex flex-1 justify-center px-2 text-gray-400 italic font-bold items-center">
              No sites connected
            </div>
          ) : (
            sites.map((site) => {
              // Handle both click and double-click
              let clickTimeout: NodeJS.Timeout;
              const handleClick = (e: React.MouseEvent, siteId: number) => {
                e.stopPropagation();
                clearTimeout(clickTimeout);
                clickTimeout = setTimeout(() => {
                  handleSiteSelect(siteId);
                }, 200);
              };

              const handleDoubleClick = (e: React.MouseEvent, site: ISite) => {
                e.stopPropagation();
                clearTimeout(clickTimeout);
                handleEditClick(site);
              };

              return (
                <div 
                  key={site.id} 
                  className="flex py-1 flex-col items-center min-w-[90px] group cursor-pointer"
                  onClick={(e) => handleClick(e, site.id!)}
                >
                  <div 
                    className={`relative p-1 rounded-lg transition-all duration-200 ${
                      selectedSiteIdState === site.id ? 'ring-2 ring-teal-400' : ''
                    }`}
                    onDoubleClick={(e) => handleDoubleClick(e, site)}
                  >
                    <img
                      src={getSiteIcon(site.cms?.name)}
                      alt={`${site.cms?.name || 'Default'} Logo`}
                      className="w-15 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                  <span className={`text-xs mt-1 font-bold transition-colors ${
                    selectedSiteIdState === site.id ? 'text-teal-400' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {getSiteDisplayName(site)}
                  </span>
                </div>
              );
            })
          )}
        </div>
        
        <div className="bg-[#2D3748] px-4 py-2 rounded-lg ml-4 border border-gray-600 shadow-sm min-w-[500px] min-h-[230px]">
          <h3 className="font-semibold mb-1 text-gray-100">Connected CMS</h3>
          <div className="text-sm text-teal-400 font-medium">
            {sites.length} site{sites.length !== 1 ? 's' : ''} connected
          </div>
          {selectedSite && (
            <div className="mt-3 space-y-2">
             <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setShowContentPreview(true)}
                 className="w-full bg-teal-600 hover:bg-teal-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
               >
                 Preview CMS Content
               </button>
               <button
                 onClick={() => handleVectorizeClick(selectedSite)}
                 className={`w-full ${
                   vectorizeStatus === 'processing' || vectorizeStatus === 'complete'
                     ? 'bg-gray-500 cursor-not-allowed'
                     : vectorizeStatus === 'error'
                     ? 'bg-red-500 hover:bg-red-600'
                     : 'bg-teal-600 hover:bg-teal-700'
                 } text-white py-1 px-3 rounded text-sm font-medium transition-colors`}
                 disabled={vectorizeStatus === 'processing' || vectorizeStatus === 'complete'}
               >
                 {vectorizeStatus === 'processing'
                   ? 'Processing...'
                   : vectorizeStatus === 'error'
                   ? 'Retry Vectorize'
                   : 'Add to AI Memory'}
               </button>
               <button 
                 onClick={() => console.log('AI Prompt button clicked for site ID:', selectedSite.id)}
                 className="w-full bg-teal-800 hover:bg-teal-900 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
               >
                 AI Prompt
               </button>
               <button 
                 onClick={() => setShowCreateDrupalSiteForm(true)}
                 className="w-full bg-teal-800 hover:bg-teal-900 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
               >
                 Create Drupal Site
               </button>
               <button 
                 onClick={() => console.log('Migrate site', selectedSite.id)}
                 className="w-full bg-teal-900 hover:bg-teal-800 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
               >
                 Migrate
               </button>
               <button
                 onClick={() => {
                   if (selectedSite) {
                     handleOpenRemoveModal(selectedSite);
                   }
                 }}
                 className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
               >
                 Remove Site
               </button>
             </div>
            

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

      <NewSiteForm 
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCurrentSite(null); // Reset current site when closing
        }}
        onSave={handleSave}
        initialData={currentSite}
        currentUser={currentUser} 
      />

      <CreateDrupalSiteForm
        isOpen={showCreateDrupalSiteForm}
        onClose={() => setShowCreateDrupalSiteForm(false)}
        onSuccess={(data) => {
          console.log('Drupal site created:', data);
          toast.success('Drupal site creation initiated successfully!');
          // Refresh the sites list
          fetchSites();
        }}
      />

      <React.Suspense fallback={null}>
        {selectedSite && showContentPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <ContentPreview
              onClose={handlePreviewClose}
              site={selectedSite}
            />
          </div>
        )}
        {selectedSite && showContentVectorize && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2D3748] rounded-lg shadow-xl p-8 max-w-5xl max-h-[90vh] overflow-y-auto">
              <Vectorize
                onClose={() => setShowContentVectorize(false)}
                onComplete={handleVectorizeComplete}
                onError={handleVectorizeError}
                site={selectedSite}
              />
            </div>
          </div>
        )}
      </React.Suspense>

      {showRemoveConfirmModal && siteToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2D3748] p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Remove Site</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to remove the site "<strong>{siteToRemove.site_name}</strong>"?
              This action cannot be undone.
            </p>
            {removeSiteError && (
              <p className="text-red-400 text-sm mb-4">Error: {removeSiteError}</p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseRemoveModal}
                disabled={isRemovingSite}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveSite}
                disabled={isRemovingSite}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isRemovingSite ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Removing...
                  </span>
                ) : (
                  "Proceed"
                )}
              </button>
            </div>
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