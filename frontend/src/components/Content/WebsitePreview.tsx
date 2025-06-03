import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ContentNode, ExtendedContentNode, WebsitePreviewProps } from '../../types/drupal';
import { fetchDrupalContent } from '../../services/drupalService';

// Helper function to safely get content node type
const getNodeType = (node: ContentNode): string => {
  if (node.type) return node.type;
  if (node.bundle) return node.bundle;
  return 'other';
};

// Helper function to get HTML from content body
const getBodyHtml = (body: unknown): string => {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (Array.isArray(body)) {
    return body.map(item => getBodyHtml(item)).join('');
  }
  if (typeof body === 'object' && body !== null) {
    return Object.values(body as Record<string, unknown>).map(val => getBodyHtml(val)).join('');
  }
  return String(body);
};

const WebsitePreview: React.FC<WebsitePreviewProps> = ({ site, onClose }) => {
  // State management
  const [content, setContent] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<ExtendedContentNode | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Toggle mobile menu
  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      previewRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // Open content in new window
  const openInNewWindow = useCallback(() => {
    if (!activeContent) return;
    
    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    
    const contentHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${typeof activeContent.title === 'string' ? activeContent.title : 'Content Preview'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-4">
          <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-4">${typeof activeContent.title === 'string' ? activeContent.title : 'Untitled'}</h1>
            <div class="prose max-w-none">
              ${getBodyHtml(activeContent.body)}
            </div>
          </div>
        </body>
      </html>
    `;
    
    newWindow.document.write(contentHtml);
    newWindow.document.close();
  }, [activeContent]);

  // Group content by type
  const contentByType = useMemo(() => {
    return content.reduce<Record<string, ExtendedContentNode[]>>((acc, node) => {
      const type = getNodeType(node);
      if (!acc[type]) {
        acc[type] = [];
      }
      const extendedNode: ExtendedContentNode = {
        ...node,
        id: node.nid,
        changed: node.created || '',
        body: node.body,
      };
      acc[type].push(extendedNode);
      return acc;
    }, {});
  }, [content]);

  // Load content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const data = await fetchDrupalContent({ url: site.site_url });
        setContent(data);
        if (data.length > 0) {
          setActiveContent({
            ...data[0],
            id: data[0].nid,
            changed: data[0].created || '',
            body: data[0].body
          });
        }
      } catch (err) {
        console.error('Error loading Drupal content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [site.site_url]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded">
        Error loading content: {error}
      </div>
    );
  }

  // Render no content state
  if (content.length === 0) {
    return (
      <div className="p-4 text-gray-600">
        No content available for this site.
      </div>
    );
  }

  return (
    <div ref={previewRef} className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">{site.site_name}</h2>
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-700 rounded"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 16L4 20l4-1-1-3zM20 8l-4-1 1 3 3-2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0-4h-4m4 0l-5 5" />
              )}
            </svg>
          </button>
          <button
            onClick={openInNewWindow}
            className="p-2 hover:bg-gray-700 rounded"
            aria-label="Open in new window"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden bg-gray-100 p-2 border-b">
        <button
          onClick={toggleMenu}
          className="flex items-center text-gray-700 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:block w-64 bg-gray-100 overflow-y-auto border-r`}>
          <div className="p-4">
            <h3 className="font-medium text-gray-700 mb-2">Content Types</h3>
            <div className="space-y-2">
              {Object.entries(contentByType).map(([type, items]) => (
                <div key={type} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {type} ({items.length})
                  </h4>
                  <div className="mt-2 space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveContent(item);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded ${
                          activeContent?.id === item.id
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {typeof item.title === 'string' ? item.title : 'Untitled'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {activeContent ? (
            <div className="prose max-w-none">
              <h1 className="text-3xl font-bold mb-6">{typeof activeContent.title === 'string' ? activeContent.title : 'Untitled'}</h1>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: getBodyHtml(activeContent.body)
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an item from the sidebar to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsitePreview;