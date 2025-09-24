import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '../../components/Chat/Chat';
import Prompt from './Prompt';
import { ChatMessage, NodeCardContent } from '../../types/chat';
import Header from './Header';
import InitialDisplay from '../../components/Display/InitialDisplay';
import { AnimatePresence } from 'framer-motion';
import Sites from './Sites';
import { useNodeEvents } from '../../hooks/useNodeEvents';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { ISite, ICMS } from '../../types/sites';

// Type for the CMS data that comes from the API
interface CmsData {
  id: number;
  name: string;
  version?: string;
  user_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Type for the site data that comes from the API
interface ApiSite {
  id: number;
  user_id: string;
  company_id: number | null;
  site_name: string;
  site_url: string;
  description: string | null;
  cms: CmsData | CmsData[] | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  is_active: boolean;
  is_selected: boolean;
  schema_id: number | null;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { messages, addMessage } = useChat();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<ISite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  
  // Initialize node events
  useNodeEvents();

  // Set up node creation event listener
  useEffect(() => {
    const handleNodeCreatedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ payload: NodeCardContent }>;
      if (customEvent.detail?.payload) {
        const nodeData = customEvent.detail.payload;
        const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          text: `New node created: ${nodeData.title}`,
          sender: 'assistant',
          type: 'node',
          node: nodeData
        };
        addMessage(newMessage);
      }
    };

    window.addEventListener('node-created', handleNodeCreatedEvent as EventListener);
    return () => {
      window.removeEventListener('node-created', handleNodeCreatedEvent as EventListener);
    };
  }, [addMessage]);

  // Initialize Supabase client when currentUser is available
  useEffect(() => {
    if (!currentUser) return;

    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration. Please check your environment variables.');
      setError('Configuration error: Missing Supabase credentials');
      return;
    }

    try {
      // Initialize Supabase client with your project URL and public anon key
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      setSupabase(supabaseClient);
    } catch (error) {
      console.error('Error initializing Supabase:', error);
      setError('Failed to initialize database connection');
    }
  }, [currentUser]);

  // Fetch sites when user is authenticated
  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser || !supabase) return;

      console.log("Fetching sites for user:", currentUser.uid);
      setIsLoading(true);
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
        } else if (data) {
          console.log("Fetched sites:", data);
          // Map the data to ISite format
          const sitesWithCms = data.map(site => {
            // Handle CMS data which could be an array or object
            let cmsData: ICMS | undefined;
            
            if (site.cms) {
              if (Array.isArray(site.cms) && site.cms.length > 0) {
                // If cms is an array, take the first item
                const cmsItem = site.cms[0];
                cmsData = {
                  id: cmsItem?.id || 0,
                  name: cmsItem?.name || 'Unknown CMS',
                  version: cmsItem?.version || undefined
                };
              } else if (typeof site.cms === 'object' && site.cms !== null) {
                // If cms is a single object
                const cmsObj = site.cms as unknown as CmsData;
                cmsData = {
                  id: cmsObj?.id || 0,
                  name: cmsObj?.name || 'Unknown CMS',
                  version: cmsObj?.version || undefined
                };
              }
            }

            // Fallback if cmsData is still undefined
            if (!cmsData) {
              cmsData = {
                id: 0,
                name: 'Unknown CMS',
                version: undefined
              };
            }

            return {
              id: site.id,
              user_id: site.user_id,
              company_id: site.company_id || null,
              site_name: site.site_name || 'Unnamed Site',
              site_url: site.site_url || '',
              description: site.description,
              cms: cmsData,
              created_at: site.created_at,
              updated_at: site.updated_at,
              status: site.status,
              is_active: site.is_active,
              is_selected: site.is_selected
            };
          });
          
          setSites(sitesWithCms);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching sites:', err);
        setError('Failed to load sites');
        setSites([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSites();
  }, [currentUser]); // Re-fetch if currentUser changes

  // Handle sending chat messages
  const handleSendMessage = useCallback(async (message: string) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      text: message,
      sender: 'user',
      status: 'sending' as const
    };
    addMessage(userMessage);

    try {
      const response = await axios.post(
        '/api/chat', 
        { message }, 
        { 
          headers: { 
            Authorization: `Bearer ${await currentUser.getIdToken()}` 
          } 
        }
      );

      if (response.data) {
        addMessage({
          text: response.data.reply || 'No response from server',
          sender: 'assistant',
          status: 'sent'
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      addMessage({
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, currentUser]);

  // Handle removing a site
  const handleRemoveSite = useCallback(async (siteId: number) => {
    if (!currentUser || !supabase) return;
    
    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;

      setSites(prev => prev.filter(site => site.id !== siteId));
      
      // Add a chat message about the removed site
      addMessage({
        text: 'Site has been removed',
        sender: 'assistant',
        status: 'sent'
      });
      
    } catch (error) {
      console.error('Error removing site:', error);
      addMessage({
        text: 'Failed to remove site. Please try again.',
        sender: 'assistant',
        status: 'error'
      });
      throw error;
    }
  }, [addMessage, currentUser, supabase]);

  // Handle adding a new site
  const handleAddSite = useCallback(async (newSiteData: Omit<ISite, 'id' | 'cms'> & { cms?: ICMS; site_name: string; site_url: string }) => {
    if (!currentUser || !supabase) return;

    try {
      const { data: site, error } = await supabase
        .from('sites')
        .insert([
          {
            ...newSiteData,
            user_id: currentUser.uid
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (site) {
        const newSite = {
          ...site,
          cms: newSiteData.cms || {
            id: 0,
            name: 'Unknown CMS',
            version: undefined
          }
        };
        
        setSites(prev => [newSite, ...prev]);

        // Add a chat message about the new site
        addMessage({
          text: `Added new site: ${site.site_name || 'Unnamed Site'}`,
          sender: 'assistant',
          status: 'sent',
          site: {
            id: site.id,
            name: site.site_name || 'Unnamed Site',
            url: site.site_url || '',
            cms: newSite.cms?.name || 'Unknown CMS',
            description: site.description || ''
          }
        });

        return site;
      }
    } catch (error) {
      console.error('Error adding site:', error);
      addMessage({
        text: 'Failed to add site. Please try again.',
        sender: 'assistant',
        status: 'error'
      });
      throw error;
    }
  }, [addMessage, currentUser, supabase]);

  // Handle updating an existing site
  const handleUpdateSite = useCallback(async (updatedSite: ISite) => {
    if (!currentUser || !supabase || !updatedSite.id) return;
    
    try {
      const { data: site, error } = await supabase
        .from('sites')
        .update({
          ...updatedSite,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedSite.id)
        .select()
        .single();

      if (error) throw error;

      if (site) {
        setSites(prev =>
          prev.map(s => (s.id === site.id ? { ...s, ...site, name: site.site_name || site.name || 'Unnamed Site', url: site.site_url || site.url || '' } : s))
        );
      }
    } catch (error) {
      console.error('Error updating site:', error);
      throw error;
    }
  }, [supabase, setSites]);

  // Helper function to add site-related chat messages
  const addSiteChatMessage = useCallback((site: ISite, isUpdate: boolean) => {
    const siteName = getSiteName(site);
    const siteUrl = getSiteUrl(site);
    const cmsName = (site.cms && typeof site.cms === 'object' && 'name' in site.cms) 
      ? (site.cms as { name: string }).name 
      : 'Unknown CMS';
    
    addMessage({
      text: `Site "${siteName}" has been ${isUpdate ? 'updated' : 'created'}`,
      sender: 'assistant',
      status: 'sent',
      site: {
        id: site.id,
        name: siteName,
        url: siteUrl,
        cms: cmsName,
        description: site.description || ''
      }
    });
  }, [addMessage]);

  // Helper function to safely access site properties
  const getSiteName = (site: ISite): string => {
    if (!site) return 'Unnamed Site';
    // Use type assertion to access the properties we know exist
    const siteAny = site as any;
    return siteAny.site_name || siteAny.name || 'Unnamed Site';
  };

  const getSiteUrl = (site: ISite): string => {
    if (!site) return '';
    // Use type assertion to access the properties we know exist
    const siteAny = site as any;
    return siteAny.site_url || siteAny.url || '';
  };

  // Wrapper for the send message handler to match PromptProps
  const handlePromptSubmit = useCallback(async (message: string) => {
    return handleSendMessage(message);
  }, [handleSendMessage]);

  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col relative">
        <div 
          className="flex-1 overflow-y-auto p-4"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0, 20, 20, 0.91), rgba(45, 55, 72, 0.96)), url('/images/plans/tech-bg-dashboard.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
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
        <div className="bg-[#083633] rounded-lg m-4">
          <Prompt 
            onSend={handlePromptSubmit} 
            disabled={isLoading} 
            error={error}
          />
        </div>
      </main>

      {/* Sites Section */}
      <Sites 
        sites={sites} 
        onSiteAdded={handleAddSite} 
        onSiteUpdated={handleUpdateSite}
        onSiteSelected={(siteId: number | null) => {
          setSelectedSiteId(siteId);
        }}
        selectedSiteId={selectedSiteId}
        currentUser={currentUser}
        onSiteRemoved={handleRemoveSite}
        onAddChatMessage={(message) => {
          if (message) {
            addMessage(message);
          }
        }}
      />
    </div>
  );
};

export default Dashboard;