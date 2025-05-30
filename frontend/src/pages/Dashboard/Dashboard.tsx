import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chat } from '../../components/Chat/Chat';
import Prompt from './Prompt';
import { ChatMessage } from '../../types/chat';
import Header from './Header';
import InitialDisplay from '../../components/Display/InitialDisplay';
import { AnimatePresence } from 'framer-motion';
import Sites from './Sites';
import { ISite, ICMS } from '../../types/sites';
import { supabase } from '../../utils/supabase';
import { getAuth, User } from 'firebase/auth';

export const Dashboard: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<ISite[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Get current Firebase user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch sites from Supabase when currentUser is available
  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser || !supabase) return;

      console.log("Fetching sites for user:", currentUser.uid);
      setIsLoading(true); // Optional: indicate loading for sites
      try {
        const { data, error: fetchError } = await supabase
          .from('sites')
          .select(`
            id,
            user_id,
            company_id,
            site_name,
            site_url,
            description,
            mysql_file_url,
            status,
            migration_ids,
            tags,
            is_active,
            is_selected,
            schema_id,        
            created_at,
            updated_at,
            cms:cms_id (*)
          `)
          .eq('user_id', currentUser.uid) // Fetch sites for the logged-in user
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error("Error fetching sites:", fetchError);
          setError("Failed to load your sites. " + fetchError.message);
          setSites([]);
        } else {
          console.log("Fetched sites:", data);
          // Ensure cms data is correctly mapped
          const sitesWithCms: ISite[] = data ? data.map(s => {
            let cmsData: ICMS | undefined = undefined;
            if (s.cms) { // s.cms could be an object or an array from Supabase
              if (Array.isArray(s.cms) && s.cms.length > 0) {
                cmsData = s.cms[0] as ICMS; // Take the first element if it's an array
              } else if (!Array.isArray(s.cms) && typeof s.cms === 'object' && s.cms !== null) {
                cmsData = s.cms as ICMS; // Assume it's a single object
              }
            }
            // Fallback if cmsData is still undefined (e.g., s.cms was null, empty array, or not an expected object)
            if (!cmsData) {
                console.warn(`Site with ID ${s.id} has missing, empty, or invalid CMS data. Using a default CMS.`);
                // Provide a default/fallback ICMS object.
                // ISite expects cms: ICMS, and ICMS requires name: string.
                cmsData = { 
                  id: 0, // Default ID for unknown CMS
                  name: 'Unknown CMS', // Required by ICMS interface
                  user_id: s.user_id || 'unknown', // s.user_id will be a string
                  // Initialize other optional ICMS fields if necessary
                  version: null,
                  is_active: false,
                  has_migrations: false
                };
            }
            return { ...s, cms: cmsData };
          }) : [];
          setSites(sitesWithCms);
          setError(null);
        }
      } catch (e) {
        console.error("Exception fetching sites:", e);
        setError("An unexpected error occurred while loading sites.");
        setSites([]);
      } finally {
        setIsLoading(false); // Optional: stop site loading indicator
      }
    };

    fetchSites();
  }, [currentUser]); // Re-fetch if currentUser changes

  // Handle sending chat messages
  const handleSend = async (message: string) => {
    setIsLoading(true);
    setError(null);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
        setError("Application configuration error: API endpoint is missing.");
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? {...msg, status: 'error', text: msg.text + " (Config Error)"} : msg
        ));
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        `${apiBaseUrl}/updateHomepage`,
        { prompt: message },
        { headers: { "Content-Type": "application/json" } }
      );

      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? {...msg, status: 'sent'} : msg
      ));

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        text: response.data.message,
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? {...msg, status: 'error'} : msg
      ));
      
      const errorMessage = axios.isAxiosError(err) 
        ? err.response?.data?.error || err.message || "Failed to process request"
        : err instanceof Error ? err.message : "Failed to process request";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a new site
  const handleAddSite = (newSite: ISite) => {
    // Ensure the newSite object being added to state has the CMS object structured correctly
    // and includes schema_id if available.
    console.log("Adding new site to dashboard state:", newSite);
    setSites(prev => {
      const updatedSites = [newSite, ...prev];
      console.log('Updated sites list:', updatedSites);
      return updatedSites;
    });
  };

  // Handle updating an existing site
  const handleUpdateSite = (updatedSite: ISite) => {
    console.log('Updating site:', updatedSite);
    setSites(prev => {
      const updatedSites = prev.map(site => 
        site.id === updatedSite.id ? updatedSite : site
      );
      console.log('Sites after update:', updatedSites);
      return updatedSites;
    });
  };

  // Helper function to add site-related chat messages
  const addSiteChatMessage = (site: ISite, isUpdate: boolean) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      text: `Site "${site.site_name}" has been  ${isUpdate ? 'updated' : 'created'}`,
      sender: 'assistant',
      status: 'sent',
      timestamp: new Date(),
      site: {
        id: site.id || Date.now(),
        name: site.site_name,
        url: site.site_url,
        cms: site.cms.name,
        description: site.description
      }
    };
    setMessages(prev => [...prev, message]);
  };

  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-4" style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 20, 20, 0.91), rgba(45, 55, 72, 0.96)), url('/images/plans/tech-bg-dashboard.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}>
          
          {/* Chat Content Area */}
          {/* Initial welcome message when no messages exist */}
          <AnimatePresence>
            {messages.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <InitialDisplay show={true} />
              </div>
            )}
          </AnimatePresence>
          
          {/* Chat Messages */}
          <Chat messages={messages} />
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start mt-2">
              <div className="bg-[#2D3748] px-4 py-2 rounded-lg rounded-bl-none max-w-xs">
                <div className="flex items-center text-blue-400">
                  <span className="text-sm">Thinking</span>
                  <span className="ml-2 flex space-x-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input Section */}
        <div className="bg-[#083633] rounded-lg m-4 ">
          <Prompt onSend={handleSend} disabled={isLoading} />
          {error && (
            <div className="text-red-400 text-sm mt-2">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Sites Section */}
      <Sites 
        sites={sites} 
        onSiteAdded={handleAddSite} 
        onSiteUpdated={handleUpdateSite}
        onSiteRemoved={(siteId) => {
          console.log('Removing site with ID:', siteId);
          setSites(prevSites => {
            const updatedSites = prevSites.filter(site => site.id !== siteId);
            console.log('Sites after removal:', updatedSites);
            return updatedSites;
          });
        }}
        onAddChatMessage={(message) => {
          console.log('Received chat message in Dashboard:', message);
          
          // message.site might be a partial site object or just contain an ID
          // We need to find the full site from our state to get all details
          const siteFromMessage = message.site;
          console.log('Site from message:', siteFromMessage);
          
          if (siteFromMessage && siteFromMessage.id !== undefined) {
            console.log('Looking for site with ID:', siteFromMessage.id, 'in sites:', sites);
            const fullSite = sites.find(s => s.id === siteFromMessage.id);
            console.log('Found site:', fullSite);

            if (fullSite) {
              console.log('Creating chat message for site:', fullSite);
              addSiteChatMessage(
                {
                  // Construct the payload using data from fullSite
                  id: fullSite.id,
                  user_id: fullSite.user_id || currentUser?.uid || '',
                  site_name: fullSite.site_name,
                  site_url: fullSite.site_url,
                  cms: {
                    id: fullSite.cms?.id || 0,
                    name: fullSite.cms?.name || 'Unknown CMS',
                    user_id: fullSite.cms?.user_id || fullSite.user_id || currentUser?.uid || ''
                  },
                  description: fullSite.description || '',
                  schema_id: fullSite.schema_id || null,
                  // Add any other fields from ISite that addSiteChatMessage might need
                },
                message.text.includes('updated') // Determine if update based on message
              );
            } else {
              console.warn('Site for chat message not found in state:', siteFromMessage.id);
              // Try to use the site data from the message if available
              if (siteFromMessage.site_name) {
                console.log('Using site data from message');
                addSiteChatMessage(
                  {
                    id: siteFromMessage.id,
                    user_id: siteFromMessage.user_id || currentUser?.uid || '',
                    site_name: siteFromMessage.site_name,
                    site_url: siteFromMessage.site_url,
                    cms: {
                      id: siteFromMessage.cms?.id || 0,
                      name: siteFromMessage.cms?.name || 'Unknown CMS',
                      user_id: siteFromMessage.cms?.user_id || siteFromMessage.user_id || currentUser?.uid || ''
                    },
                    description: siteFromMessage.description || '',
                    schema_id: siteFromMessage.schema_id || null,
                  },
                  message.text.includes('updated')
                );
              }
            }
          } else {
            console.warn('No site ID in message:', message);
          }
        }}
        onSiteSelected={(site) => {
          // Handle site selection logic, e.g., set selectedSite state
          console.log("Site selected in Dashboard:", site);
          // Example: setSelectedSite(site);
        }}
        currentUser={currentUser} // Pass currentUser to Sites component
      />
    </div>
  );
};