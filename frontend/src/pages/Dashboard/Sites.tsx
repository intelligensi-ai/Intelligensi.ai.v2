import NewSiteForm from '../../components/Sites/NewSiteForm';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CreateDrupalSiteForm from '../../components/Sites/CreateDrupalSiteForm';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, BoltIcon } from '@heroicons/react/24/outline';
import { ThemeCraftModal } from '../../theme';
import axios from "axios";
import { User } from "firebase/auth";
import { ISite, ICMS } from "../../types/sites";
import { getSiteIcon, getSiteDisplayName } from '../../utils/siteHelpers';
import WebsitePreview from '../../components/Content/WebsitePreview';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

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
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [showCreateDrupalSiteForm, setShowCreateDrupalSiteForm] = useState(false);
  const [showWebsitePreview, setShowWebsitePreview] = useState(false);

  const handleThemeScan = useCallback(async (url: string) => {
    try {
      const scanTheme = httpsCallable<{ url: string }, any>(functions, 'scanWebsiteTheme');
      const result = await scanTheme({ url });
      console.log('Theme scan result:', result);
      toast.success('Theme scanned successfully!');
      return result;
    } catch (error) {
      console.error('Error scanning theme:', error);
      toast.error('Failed to scan theme. Please try again.');
      throw error;
    }
  }, []);

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
    <div className="bg-[#2D3748] min-h-[210px] p-4 border-t border-gray-700">
      <div className="flex gap-4">
        {/*  CMS Management Buttons */}
        <div className="w-[140px] flex flex-col gap-4">
          <button 
            onClick={() => {
              setCurrentSite(null);
              setIsFormOpen(true);
            }}
            className="w-[140px] h-[42px] px-3 py-1.5 border-teal-200 border-2 font-extrabold bg-teal-500 hover:bg-teal-400 text-white rounded-md text-sm flex items-center justify-center transition-colors duration-200 shadow-md"
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
            className="w-[140px] h-[42px] px-3 py-1.5 border-teal-200 border-2 font-extrabold bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm flex items-center justify-center transition-colors duration-200 shadow-md"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:space-x-4 gap-2 lg:gap-0 w-full lg:w-max">
                {sites.map((site) => (
                <div 
                  key={site.id} 
                  className="flex py-1 flex-col items-center w-full min-w-[90px] group cursor-pointer px-2"
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
                    <div className="relative w-16 sm:w-16 lg:w-18 h-[3.8rem] sm:h-[4.2rem] flex items-center justify-center">
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
                  <div className="w-full text-center">
                    <span className={`text-xs mt-1 font-bold transition-colors inline-block w-full text-center ${
                      selectedSiteIdState === site.id ? 'text-teal-400' : 'text-gray-300 group-hover:text-white'
                    }`}>
                      {getSiteDisplayName(site)}
                    </span>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Buttons and Info */}
        <div className="flex-1 flex gap-4">
          {/* Buttons Card - Slightly reduced width to make room for info */}
          <div className="bg-[#2D3748] px-4 py-4 rounded-lg border border-gray-600 shadow-sm w-full md:w-[45%]">
            {selectedSite && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <button 
                  onClick={() => setShowWebsitePreview(true)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 h-10"
                >
                  <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleVectorizeClick(selectedSite)}
                  className={`w-full py-2.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 h-10 ${
                    vectorizeStatus === 'processing' || vectorizeStatus === 'complete'
                      ? 'bg-gray-500 cursor-not-allowed'
                      : vectorizeStatus === 'error'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-teal-600 hover:bg-teal-700'
                  } text-white`}
                  disabled={vectorizeStatus === 'processing' || vectorizeStatus === 'complete'}
                >
                  {vectorizeStatus === 'processing' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white hidden sm:inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : vectorizeStatus === 'error' ? (
                    <>
                      <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Retry</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>Memory</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => console.log('AI Prompt button clicked for site ID:', selectedSite.id)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 h-10"
                >
                  <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>Prompt</span>
                </button>
                <button 
                  onClick={() => {
                    if (selectedSite?.site_url) {
                      setIsThemeModalOpen(true);
                    } else {
                      toast.error('No URL available for this site');
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 h-10"
                >
                  <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  Theme
                </button>
                {/* Create New CMS button moved to left column */}
                <button 
                  onClick={() => console.log('Migrate site', selectedSite.id)}
                  className="w-full bg-teal-900 hover:bg-teal-800 text-white py-2.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 h-10"
                >
                  <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Migrate</span>
                </button>
                <button
                  onClick={() => handleOpenRemoveModal(selectedSite)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 h-10"
                >
                  <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Site Info Card */}
          {selectedSite && (
            <div className="hidden md:block bg-[#2D3748] px-4 rounded-lg border border-gray-600 shadow-sm w-full md:w-[55%]">
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

      {/* Website Preview Modal */}
      {showWebsitePreview && selectedSite && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowWebsitePreview(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <WebsitePreview 
                site={{
                  id: selectedSite.id?.toString() || '',
                  name: selectedSite.site_name || 'Website Preview',
                  url: selectedSite.site_url || ''
                }} 
                onClose={() => setShowWebsitePreview(false)} 
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Theme Craft Modal */}
      <ThemeCraftModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onScan={handleThemeScan}
      />
    </div>
  );
};

export default Sites;