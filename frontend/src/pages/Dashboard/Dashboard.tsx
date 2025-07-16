import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { Chat } from '../../components/Chat/Chat';
import InitialDisplay from '../../components/Display/InitialDisplay';
import { ChatMessage } from '../../types/chat';
import { ISite } from '../../types/sites';
import { supabase } from '../../utils/supabase';
import Prompt from './Prompt';
import Header from './Header';
import Sites from './Sites';

interface ICMS {
  id?: number;
  name: string;
  version?: string | null;
  is_active?: boolean;
  has_migrations?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
  user_id?: string;
}

export const Dashboard: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<ISite[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedSite, setSelectedSite] = useState<ISite | null>(null);

  // Memoize mock user to prevent unnecessary recreations
  const mockUser = React.useMemo(() => ({
    uid: 'dev-user-123',
    email: 'dev@example.com',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    displayName: 'Developer User',
    photoURL: '',
    providerId: 'firebase',
    phoneNumber: null,
    tenantId: null,
    delete: async () => { /* noop */ },
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({
      authTime: '',
      expirationTime: '',
      issuedAtTime: '',
      signInProvider: 'password',
      signInSecondFactor: null,
      token: 'mock-id-token',
      claims: {},
    }),
    reload: async () => { /* noop */ },
    toJSON: () => ({})
  } as unknown as User), []);

  // Set mock user on initial render
  useEffect(() => {
    setCurrentUser(mockUser);
  }, [mockUser]);

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
          // Define a type for the raw site data from the database
          type RawSite = {
            id: number;
            user_id: string;
            cms_id: number;
            cms_version?: string;
            company_id: number | null;
            site_name: string;
            site_url: string;
            description: string | null;
            mysql_file_url: string | null;
            status: string | null;
            migration_ids: number[] | null;
            tags: string | null;
            is_active: boolean;
            is_selected?: boolean;
            schema_id: number | null;
            created_at: string;
            updated_at: string;
            cms: any; // Can be array or object
          };

          const sitesWithCms: ISite[] = data ? (data as RawSite[]).map(s => {
            // Create a base CMS object with default values
            const baseCms: ICMS = {
              id: 0,
              name: 'Unknown CMS',
              version: s.cms_version || null,
              is_active: false,
              has_migrations: false,
              user_id: s.user_id || 'unknown'
            };

            // If cms data exists, use it to override the base values
            if (s.cms) {
              let cmsFromDb: Partial<ICMS> = {};
              
              if (Array.isArray(s.cms) && s.cms.length > 0) {
                cmsFromDb = { ...s.cms[0] };
              } else if (typeof s.cms === 'object' && s.cms !== null) {
                cmsFromDb = { ...s.cms };
              }
              
              // Merge the database CMS data with our base, preserving the version from the site
              Object.assign(baseCms, cmsFromDb, {
                version: s.cms_version || cmsFromDb.version || null
              });
              
              if (!cmsFromDb.name) {
                console.warn(`Site with ID ${s.id} has CMS data but no name. Using default.`);
              }
            } else {
              console.warn(`Site with ID ${s.id} has no CMS data. Using default.`);
            }
            
            // Return the site with the properly typed CMS data
            const { cms, cms_version, ...siteData } = s;
            return { ...siteData, cms: baseCms };
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

      // Check if a site is selected
      if (!selectedSite) {
        setError("Please select a site first");
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? {...msg, status: 'error'} : msg
        ));
        setIsLoading(false);
        return;
      }

      // Get the site URL from the selected site
      const siteUrl = selectedSite.site_url;
      if (!siteUrl) {
        setError("Selected site is missing a URL");
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? {...msg, status: 'error'} : msg
        ));
        setIsLoading(false);
        return;
      }

      console.log("Sending request to OpenAI with site URL:", siteUrl);
      // Determine the CMS version from the selected site
      const cmsName = selectedSite.cms?.name?.toLowerCase() || '';
      const cmsVersion = selectedSite.cms?.version || '';
      const isDrupal11 = cmsName.includes('drupal') && cmsVersion.startsWith('11');
      const cmsType = isDrupal11 ? 'drupal11' : 'drupal7';
      
      console.log(`Using CMS: ${cmsName} ${cmsVersion} (${cmsType}) for site ${siteUrl}`);
      
      // Prepare the request data with site information
      const requestData: any = {
        prompt: message,
        siteUrl: siteUrl,
        cmsVersion: cmsType,
        cmsName: cmsName,
        cmsVersionNumber: cmsVersion
      };
      
      // Add Drupal admin credentials for Drupal 11
      if (isDrupal11) {
        // In a production environment, these should be retrieved from a secure source
        // For now, we'll use the site's credentials if available, or fall back to defaults
        const username = selectedSite.drupal_username || 'admin';
        const password = selectedSite.drupal_password || 'admin';
        
        requestData.username = username;
        requestData.password = password;
        
        // Log a warning in development if using default credentials
        if (process.env.NODE_ENV === 'development' && (!selectedSite.drupal_username || !selectedSite.drupal_password)) {
          console.warn('Using default admin credentials for Drupal 11. In production, store credentials securely.');
        }
      }
      
      const response = await axios.post(
        `${apiBaseUrl}/updateHomepage`,
        requestData,
        { 
          headers: { 
            "Content-Type": "application/json" 
          } 
        }
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
        currentUser={currentUser}
        onSiteSelected={(siteId) => {
          const site = sites.find(s => s.id === siteId) || null;
          setSelectedSite(site);
          // Add a message when a site is selected
          if (site) {
            const message: ChatMessage = {
              id: `site-${siteId}-selected`,
              text: `Now working with site: ${site.site_name}`,
              sender: 'assistant',
              timestamp: new Date(),
              status: 'sent',
              site: {
                id: site.id,
                name: site.site_name,
                url: site.site_url,
                cms: site.cms?.name || 'Unknown',
                description: site.description || ''
              }
            };
            setMessages(prev => [message, ...prev]);
          }
        }}
        onSiteRemoved={(siteId) => {
          // Find the site before it's removed
          const siteToRemove = sites.find(site => site.id === siteId);
          
          // Remove the site from state
          setSites(prev => prev.filter(site => site.id !== siteId));
          
          // Clear selected site if it's the one being removed
          if (selectedSite?.id === siteId) {
            setSelectedSite(null);
          }
          
          // Add a notification about the removed site
          if (siteToRemove) {
            const chatMessage: ChatMessage = {
              id: `site-${siteId}-removed`,
              text: `Site "${siteToRemove.site_name}" has been removed`,
              sender: 'assistant',
              status: 'sent',
              timestamp: new Date(),
              site: {
                id: siteId,
                name: siteToRemove.site_name,
                url: siteToRemove.site_url,
                cms: siteToRemove.cms?.name || 'Unknown',
                description: siteToRemove.description || ''
              }
            };
            
            // Add the message to the chat
            setMessages(prev => [chatMessage, ...prev]);
          }
        }}
      />
    </div>
  );
};