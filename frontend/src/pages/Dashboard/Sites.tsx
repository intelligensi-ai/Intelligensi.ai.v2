import NewSiteForm from '../../components/Sites/NewSiteForm';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CreateDrupalSiteForm from '../../components/Sites/CreateDrupalSiteForm';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, BoltIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  
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
        
        // Add chat message for new site
        if (onAddChatMessage) {
          const chatMessage = {
            site: {
              id: updatedSite.id || Date.now(),
              site_name: updatedSite.site_name,
              site_url: updatedSite.site_url,
              cms: {
                name: updatedSite.cms?.name || 'Unknown',
                id: updatedSite.cms?.id || 0,
                user_id: updatedSite.user_id || ''
              },
              description: updatedSite.description,
              schema_id: updatedSite.schema_id || null,
              user_id: updatedSite.user_id || ''
            },
            text: `Site "${updatedSite.site_name}" has been connected`
          };
          
          console.log('Sending chat message:', chatMessage);
          onAddChatMessage(chatMessage);
        } else {
          console.warn('onAddChatMessage is not defined');
        }
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
    if (!siteToRemove) {
      console.error('No site to remove');
      return;
    }

    console.log('Starting site removal for ID:', siteToRemove.id);
    setIsRemovingSite(true);
    setRemoveSiteError(null);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        const errorMsg = "CRITICAL: REACT_APP_API_BASE_URL is not defined.";
        console.error(errorMsg);
        setRemoveSiteError("Configuration error. Please contact support.");
        setIsRemovingSite(false);
        return;
      }

      console.log(`Attempting to delete site with ID: ${siteToRemove.id} via ${apiBaseUrl}/deleteSite`);

      const response = await axios.post(`${apiBaseUrl}/deleteSite`, {
        siteId: siteToRemove.id,
      });

      console.log('Delete site response:', response.data);

      if (response.data.success) {
        console.log(`Site ${siteToRemove.id} successfully deleted from backend.`);
        
        // Update local state
        setSites(prevSites => {
          const updatedSites = prevSites.filter(s => s.id !== siteToRemove.id);
          console.log('Updated sites after removal:', updatedSites);
          return updatedSites;
        });

        if (selectedSiteIdState === siteToRemove.id) {
          console.log('Deselecting removed site:', selectedSiteIdState);
          onSiteSelected(null);
          setSelectedSiteIdState(null);
        } else {
          console.log('No need to deselect, current selection:', selectedSiteIdState);
        }

        // Call the onSiteRemoved callback if provided
        if (onSiteRemoved) {
          console.log('Calling onSiteRemoved with ID:', siteToRemove.id);
          onSiteRemoved(siteToRemove.id);
        } else {
          console.warn('onSiteRemoved callback is not defined');
        }
        
        handleCloseRemoveModal();
        console.log("Site removal UI updated and modal closed.");
      } else {
        const errorMsg = response.data.error || "Failed to delete site from server.";
        console.error("Backend failed to delete site:", errorMsg);
        throw new Error(errorMsg);
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
    <div className="bg-[#2D3748] h-[210px] p-4 border-t border-gray-700">
      <div className="flex gap-4">
        {/* Leftmost column - CMS Management Buttons */}
        <div className="w-[200px] flex flex-col gap-4">
          <button 
            onClick={() => {
              setCurrentSite(null);
              setIsFormOpen(true);
            }}
            className="w-full h-[60px] px-4 py-2 border-teal-200 border-2 font-extrabold bg-teal-500 hover:bg-teal-400 text-white rounded-md text-1xl flex items-center justify-center transition-colors duration-200 shadow-md"
          >
            <svg 
              className="w-4 h-4 mr-2" 
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
            <span>Connect</span>
          </button>
          
          <button 
            onClick={() => setShowCreateDrupalSiteForm(true)}
            className="w-full h-[60px] px-4 py-2 border-teal-200 border-2 font-extrabold bg-teal-600 hover:bg-teal-500 text-white rounded-md text-1xl flex items-center justify-center transition-colors duration-200 shadow-md"
          >
            <svg 
              className="w-4 h-5 mr-2" 
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
            <span>Create</span>
          </button>
        </div>

        {/* Middle column - Site Icons */}
        <div className="bg-[#344054] py-3 rounded-lg border border-gray-600 shadow-sm overflow-hidden">
          <div className="overflow-x-auto px-2">
            {sites.length === 0 ? (
              <div className="flex justify-center items-center w-full h-24 text-gray-400 italic font-bold">
                No sites connected
              </div>
            ) : (
              <div className="flex space-x-4 w-max">
                {sites.map((site) => (
                <div 
                  key={site.id} 
                  className="flex py-1 flex-col items-center min-w-[90px] group cursor-pointer px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSiteSelect(site.id!);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(site);
                  }}
                >
                  <div className="relative p-1.5 rounded-lg group/icon">
                    <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
                      selectedSiteIdState === site.id 
                        ? 'opacity-0' 
                        : 'group-hover:bg-teal-900/10'
                    }`}></div>
                    <div className="relative w-18 h-[4.2rem] flex items-center justify-center">
                      <img
                        src={getSiteIcon(site.cms?.name)}
                        alt={`${site.cms?.name || 'Default'} Logo`}
                        className={`w-full h-full object-contain transition-all duration-300 ${
                          selectedSiteIdState === site.id 
                            ? 'drop-shadow-[0_0_12px_rgba(45,212,191,0.8)]' 
                            : 'group-hover/icon:drop-shadow-[0_0_6px_rgba(45,212,191,0.4)]'
                        }`}
                      />
                    </div>
                  </div>
                  <span className={`text-xs mt-1 font-bold transition-colors ${
                    selectedSiteIdState === site.id ? 'text-teal-400' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {getSiteDisplayName(site)}
                  </span>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Buttons and Info */}
        <div className="flex-1 flex gap-4">
          {/* Buttons Card - Slightly reduced width to make room for info */}
          <div className="bg-[#2D3748] px-4 py-4 rounded-lg border border-gray-600 shadow-sm w-[45%]">
            {selectedSite && (
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setShowContentPreview(true)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                >
                  Preview Content
                </button>
                <button
                  onClick={() => handleVectorizeClick(selectedSite)}
                  className={`w-full py-2 px-3 rounded text-sm font-medium transition-colors ${
                    vectorizeStatus === 'processing' || vectorizeStatus === 'complete'
                      ? 'bg-gray-500 cursor-not-allowed'
                      : vectorizeStatus === 'error'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-teal-600 hover:bg-teal-700'
                  } text-white`}
                  disabled={vectorizeStatus === 'processing' || vectorizeStatus === 'complete'}
                >
                  {vectorizeStatus === 'processing'
                    ? 'Processing...'
                    : vectorizeStatus === 'error'
                    ? 'Retry Vectorize'
                    : 'Add to AI Memory'}
                </button>
                <button 
                  onClick={() => setShowAIPrompt(true)}
                  className="w-full bg-teal-800 hover:bg-teal-900 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                >
                  AI Prompt
                </button>
                {/* Create New CMS button moved to left column */}
                <button 
                  onClick={() => console.log('Migrate site', selectedSite.id)}
                  className="w-full bg-teal-900 hover:bg-teal-800 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                >
                  Migrate
                </button>
                <button
                  onClick={() => handleOpenRemoveModal(selectedSite)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                >
                  Remove Site
                </button>
              </div>
            )}
          </div>
          
          {/* Site Info Card - Increased width from 1/2 to 55% */}
          {selectedSite && (
            <div className="bg-[#2D3748] px-10rounded-lg border rounded border-gray-600 shadow-sm w-[55%]">
              <h2 className="text-sm font-semibold px-4  text-gray-100 tracking-wider mb-3 pb-1 border-b border-gray-600">Site Information</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 px-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Name</p>
                    <p className="text-sm text-gray-200">{selectedSite.site_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">CMS</p>
                    <p className="text-sm text-gray-200">{selectedSite.cms?.name || 'N/A'}</p>
                  </div>
                </div>
                {selectedSite.description && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Description</p>
                      <p className="text-sm text-gray-200">{selectedSite.description}</p>
                    </div>
                  </div>
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

      {/* AI Prompt Modal */}
      {showAIPrompt && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2D3748] rounded-lg shadow-xl w-full max-w-2xl border border-teal-600">
            <div className="flex justify-between items-center p-4 border-b border-gray-600">
              <h3 className="text-lg font-semibold text-white">AI Content Generator</h3>
              <button 
                onClick={() => {
                  setShowAIPrompt(false);
                  setSearchResult('');
                  setAiQuery('');
                  setAiPrompt('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Search Query
                </label>
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter your search query..."
                  disabled={isSearching}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Custom Prompt (optional)
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-32 bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Customize how the AI should process the results..."
                  disabled={isSearching}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Default: Transform the content into a captivating article
                </p>
              </div>

              <input type="hidden" name="certainty" value="0.72" />

              {searchResult && (
                <div className="mt-4 p-4 bg-gray-800 rounded-md">
                  <h4 className="font-medium text-teal-400 mb-2">Generated Content:</h4>
                  <div className="prose prose-invert max-w-none">
                    {searchResult.split('\n').map((paragraph, i) => (
                      <p key={i} className="text-gray-200">{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAIPrompt(false);
                    setSearchResult('');
                    setAiQuery('');
                    setAiPrompt('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
                  disabled={isSearching}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!aiQuery.trim()) {
                      toast.error('Please enter a search query');
                      return;
                    }

                    setIsSearching(true);
                    setSearchResult('');

                    try {
                      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
                      const response = await fetch(`${apiBaseUrl}/simpleSearch`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          query: aiQuery,
                          prompt: aiPrompt,
                          certainty: 0.72
                        }),
                      });

                      const data = await response.json();
                      
                      if (response.ok) {
                        setSearchResult(data.generated || 'No content generated');
                      } else {
                        throw new Error(data.error || 'Failed to generate content');
                      }
                    } catch (error) {
                      console.error('Error generating content:', error);
                      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center"
                  disabled={isSearching || !aiQuery.trim()}
                >
                  {isSearching ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : 'Generate Content'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateDrupalSiteForm
        isOpen={showCreateDrupalSiteForm}
        onClose={() => setShowCreateDrupalSiteForm(false)}
        onSuccess={(data) => {
          console.log('Drupal site created:', data);
          toast.success('Drupal site creation initiated successfully!');
          // Refresh the sites list
          fetchSites();
        }}
        onAddChatMessage={onAddChatMessage}
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