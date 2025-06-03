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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-lg text-text-secondary">Loading content...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-red-600">
          <p className="text-xl font-medium">Error loading content</p>
          <p className="mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg text-text-secondary">No content available for {siteProp.name || 'this site'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main content render
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-text-primary">
                {siteProp.name || 'Website Preview'}
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={onClose}
                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border border-border-default rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {typeof activeContent?.title === 'string' 
                ? activeContent.title 
                : (activeContent?.title as { value?: string })?.value || 'No Title'}
            </h2>
            <div className="prose max-w-none text-text-secondary">
              {activeContent?.body ? (
                <div dangerouslySetInnerHTML={{ __html: getBodyHtml(activeContent.body) }} className="text-text-primary" />
              ) : (
                <p className="text-text-muted">No content available</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WebsitePreview;
