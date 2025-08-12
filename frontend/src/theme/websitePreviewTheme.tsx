import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ISite } from '../types/sites';

interface ContentNode {
  nid: string;
  title: string;
  created: string;
  status: string;
  type: string;
  body: string;
}

interface WebsitePreviewProps {
  site: ISite;
  onClose: () => void;
}

const WebsitePreview: React.FC<WebsitePreviewProps> = ({ site, onClose }) => {
  const [content, setContent] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<ContentNode | null>(null);

  // Format content node from API response
  const formatContentNode = useCallback((item: any): ContentNode => {
    // Handle different possible body field names from the API
    const bodyContent = item.body?.[0]?.value ||  // Drupal JSON:API format
                      item.body?.[0]?.processed ||  // Drupal REST format
                      item.body ||                // Direct body string
                      item.field_body?.[0]?.value ||  // Common Drupal field name
                      item.content?.[0]?.value ||  // Another common field name
                      '';                        // Fallback to empty string

    return {
      nid: item.nid?.toString() || '',
      title: item.title || item.label || 'Untitled',
      created: item.created?.toString() || Math.floor(Date.now() / 1000).toString(),
      status: item.status?.toString() || '1',
      type: item.type || 'page',
      body: bodyContent
    };
  }, []);

  // Mock data for development
  const mockContent: ContentNode[] = [
    {
      nid: '1',
      title: 'Welcome to Our Website',
      created: Math.floor(Date.now() / 1000).toString(),
      status: '1',
      type: 'page',
      body: `
        <h1>Welcome to Our Website</h1>
        <p>This is a preview of how your website content will appear.</p>
        <p>You can navigate between pages using the sidebar menu.</p>
      `
    },
    {
      nid: '2',
      title: 'About Us',
      created: Math.floor(Date.now() / 1000 - 86400).toString(),
      status: '1',
      type: 'page',
      body: `
        <h1>About Our Company</h1>
        <p>We are a team of passionate individuals dedicated to creating amazing web experiences.</p>
      `
    }
  ];

  useEffect(() => {
    const loadContent = async () => {
      if (!site?.site_url) {
        setError('No site URL available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use the backend proxy to avoid CORS issues
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/intelligensi-ai-v2/us-central1';
        
        const response = await axios.get(`${apiBaseUrl}/drupal7/structure`, {
          params: { 
            endpoint: site.site_url,
            _t: Date.now()
          },
          timeout: 30000,
        });

        let data = [];
        if (response.data?.structure) {
          data = response.data.structure;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data?.data) {
          data = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        } else if (typeof response.data === 'object') {
          data = [response.data];
        }
        
        const contentNodes = data.map(item => formatContentNode(item));
        setContent(contentNodes.length ? contentNodes : mockContent);
        setCurrentPage(contentNodes[0] || mockContent[0]);
        
      } catch (err) {
        console.error('Error loading content:', err);
        setError(axios.isAxiosError(err) 
          ? `Failed to load content: ${err.response?.data?.error || err.message}`
          : 'Failed to load content. Using sample data.');
        setContent(mockContent);
        setCurrentPage(mockContent[0]);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [site?.site_url, formatContentNode]);

  // Format date for display
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading website preview...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">Error Loading Content</h3>
          <p className="text-gray-600 text-sm mb-4 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main preview UI
  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-50">
      {/* Browser chrome */}
      <div className="bg-gray-200 p-2 flex items-center border-b border-gray-300">
        <div className="flex space-x-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="bg-white flex-1 rounded-lg px-4 py-1.5 text-sm text-gray-700 truncate">
          {site.site_name || 'Website Preview'}
        </div>
        <button 
          onClick={onClose}
          className="ml-4 text-gray-600 hover:text-gray-900"
          aria-label="Close preview"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
          <h2 className="font-semibold text-gray-800 mb-4">Pages</h2>
          <nav className="space-y-1">
            {content.map((page) => (
              <button
                key={page.nid}
                onClick={() => setCurrentPage(page)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage?.nid === page.nid
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-8">
          {currentPage && (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {currentPage.title}
              </h1>
              <div className="text-sm text-gray-500 mb-6">
                {formatDate(currentPage.created)}
              </div>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: currentPage.body }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsitePreview;


 