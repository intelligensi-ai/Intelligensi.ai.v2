import React, { useState, useEffect, useMemo } from 'react';
import { fetchDrupalContent, ContentNode as DrupalContentNode } from '../Lib/fetchDrupalContent';
import { ISite } from '../../types/sites';

type WebsitePreviewProps = {
  site: {
    id: string;
    name: string;
    url: string;
    site_url?: string;
  };
  onClose: () => void;
};

// Helper function to safely get content node type
const getNodeType = (node: DrupalContentNode): string => {
  return node.type || 'other';
};

// Helper function to get HTML from content body
const getBodyHtml = (body: unknown): string => {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (Array.isArray(body)) {
    return body.map(item => getBodyHtml(item)).join('');
  }
  if (typeof body === 'object' && body !== null) {
    return Object.values(body as Record<string, unknown>)
      .map(val => getBodyHtml(val))
      .join('');
  }
  return String(body);
};

// Format date from timestamp
const formatDate = (timestamp: string): string => {
  try {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

const WebsitePreview: React.FC<WebsitePreviewProps> = ({ site: siteProp, onClose }) => {
  const [content, setContent] = useState<DrupalContentNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<DrupalContentNode | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Group content by type for navigation
  const contentTypes = useMemo(() => {
    const types = new Set<string>(['Home']);
    content.forEach(item => {
      if (item.type) {
        types.add(item.type);
      }
    });
    return Array.from(types);
  }, [content]);

  // Get content for the current type
  const currentTypeContent = useMemo(() => {
    if (!activeContent?.type) return [];
    return content.filter(item => item.type === activeContent.type);
  }, [content, activeContent?.type]);

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

  // Clean HTML from body text
  const cleanBodyText = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Get preview text with optional length limit
  const getPreviewText = (html: string, maxLength: number = 200): string => {
    const text = cleanBodyText(html);
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
  };

  // Set first content as active if none is selected
  useEffect(() => {
    if (content.length > 0 && !activeContent) {
      setActiveContent(content[0]);
    }
  }, [content, activeContent]);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle content selection
  const handleContentSelect = (contentItem: DrupalContentNode) => {
    setActiveContent(contentItem);
  };

  // Render loading state
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
      {/* Banner */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{siteProp.name || 'Website Preview'}</h1>
              <p className="mt-2 text-indigo-100">Previewing your website content</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
            >
              Exit Preview
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {contentTypes.map(type => (
              <button
                key={type}
                onClick={() => {
                  const firstOfType = content.find(item => item.type === type);
                  if (firstOfType) setActiveContent(firstOfType);
                }}
                className={`px-3 py-4 text-sm font-medium ${
                  activeContent?.type === type
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
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
                  {currentTypeContent.map((item) => (
                    <button
                      key={item.nid}
                      onClick={() => setActiveContent(item)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                        activeContent?.nid === item.nid
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.title || `Untitled ${item.type}`}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {typeof activeContent?.title === 'string' 
                    ? activeContent.title 
                    : (activeContent?.title as { value?: string })?.value || 'No Title'}
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
