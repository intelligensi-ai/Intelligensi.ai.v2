import React, { useState, useEffect, useMemo } from 'react';
import { fetchDrupalContent, ContentNode as DrupalContentNode } from '../Lib/fetchDrupalContent';
import { ISite } from '../../types/sites';
// Using text fallbacks for icons to avoid type issues

type WebsitePreviewProps = {
  site: {
    id: string;
    name: string;
    url: string;
    site_url?: string;
  };
  onClose: () => void;
};

// Helper function to get HTML from content body
const getBodyHtml = (body: unknown): string => {
  if (!body) return '';
  
  try {
    if (typeof body === 'string') return body;
    if (typeof body === 'object' && body !== null && 'value' in body) {
      return String(body.value);
    }
    return JSON.stringify(body);
  } catch (err) {
    console.error('Error parsing body content:', err);
    return '';
  }
};

const WebsitePreview: React.FC<WebsitePreviewProps> = ({ site: siteProp, onClose }) => {
  // State management
  const [content, setContent] = useState<DrupalContentNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<DrupalContentNode | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fetch content when component mounts
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create a site object that matches the ISite interface expected by fetchDrupalContent
        const siteData: ISite = {
          id: parseInt(siteProp.id) || 0,
          user_id: 'preview-user', // Default user ID for preview
          site_name: siteProp.name || 'Preview Site',
          site_url: siteProp.site_url || siteProp.url,
          cms: {
            id: 1,
            name: 'drupal',
            version: '7',
            is_active: true,
            has_migrations: false
          },
          is_active: true,
          is_selected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const fetchedContent = await fetchDrupalContent(siteData);
        setContent(fetchedContent);
        
        // Set the first content item as active if available
        if (fetchedContent.length > 0) {
          setActiveContent(fetchedContent[0]);
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : 'An error occurred while fetching content'
        );
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [siteProp]);

  // Group content by type for navigation
  const contentByType = useMemo(() => {
    return content.reduce<Record<string, DrupalContentNode[]>>((acc, node) => {
      const type = node.type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(node);
      return acc;
    }, {});
  }, [content]);

  // Get preview text for content items
  const getPreviewText = (body: unknown): string => {
    const text = getBodyHtml(body);
    if (!text) return '';
    
    // Simple text extraction without DOM manipulation
    const cleanText = String(text)
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/\s+/g, ' ')      // Collapse whitespace
      .trim();
      
    return cleanText.length > 150
      ? `${cleanText.substring(0, 150).trim()}...`
      : cleanText;
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Set first content item as active when content loads
  useEffect(() => {
    if (content.length > 0 && !activeContent) {
      setActiveContent(content[0]);
    }
  }, [content, activeContent]);
  
  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-lg text-text-primary">Loading content...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-400 mb-2">Error loading content</p>
          <p className="text-text-primary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (content.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <p className="text-lg text-text-primary mb-4">No content available for {siteProp.name || 'this site'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }



  // Main content render
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Control Panel */}
      <div className="bg-gray-800 text-white p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="text-blue-400 mr-2 text-lg">🌐</span>
              <span className="font-medium">{siteProp.name || 'Website Preview'}</span>
            </div>
            <div className="hidden md:flex items-center text-sm text-gray-300">
              <span className="mr-2 text-blue-400 text-lg">📦</span>
              <span>Drupal 7</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-md hover:bg-gray-700 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <span className="text-lg">{isFullscreen ? '⤵️' : '⤴️'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
            >
              <span className="mr-1 text-base">✕</span>
              <span className="hidden sm:inline">Exit Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Website Preview Content */}
      <div className={`flex-1 overflow-auto ${isFullscreen ? 'h-[calc(100vh-48px)]' : ''}`}>
        {/* Hero Section with Pasta Banner */}
        <div className="relative h-96 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/images/PreviewImages/PastaBanner.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white px-4">
                <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                  {siteProp.name || 'Your Restaurant'}
                </h1>
                <p className="text-xl md:text-2xl mb-6 drop-shadow-md">
                  Discover our authentic Italian cuisine
                </p>
                <button className="px-8 py-3 bg-white text-indigo-700 font-semibold rounded-full hover:bg-indigo-50 transition-colors">
                  View Our Menu
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Site Header */}
        <div className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {siteProp.name || 'Website Preview'}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {Array.from(new Set(content.map(item => item.type))).map((type) => (
              <button
                key={type}
                onClick={() => {
                  const typeContent = content.filter(item => item.type === type);
                  if (typeContent.length > 0) {
                    setActiveContent(typeContent[0]);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md ${activeContent?.type === type ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {activeContent?.type ? `${activeContent.type}s` : 'Pages'}
                </h3>
                <nav className="space-y-1">
                  {content
                    .filter(item => activeContent?.type ? item.type === activeContent.type : true)
                    .map((item) => (
                      <div
                        key={item.nid}
                        onClick={() => setActiveContent(item)}
                        className={`p-3 rounded-md cursor-pointer ${
                          activeContent?.nid === item.nid ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900">
                          {item.title || 'Untitled'}
                        </h4>
                        {item.body && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {getPreviewText(item.body)}
                          </p>
                        )}
                      </div>
                    ))}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {activeContent?.title || 'No Title'}
                </h2>
                <div className="prose max-w-none">
                  {activeContent?.body ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: getBodyHtml(activeContent.body) }} 
                      className="text-gray-700" 
                    />
                  ) : (
                    <p className="text-gray-500">No content available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} {siteProp.name || 'Website Preview'}. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-sm text-gray-500">
                Preview Mode
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WebsitePreview;
