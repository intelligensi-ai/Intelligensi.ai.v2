import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ISite } from '../../types/sites';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface ContentNode {
  nid: string;
  title: string;
  created: string;
  status: string;
  type: string;
  body: string;
}

interface ContentPreviewProps {
  site: ISite;
  onClose: () => void;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ site, onClose }) => {
  const [content, setContent] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Format content node from Drupal API response
  const formatContentNode = useCallback((item: any): ContentNode => {
    // Basic node with safe defaults
    return {
      nid: item.nid?.toString() || '',
      title: item.title || 'Untitled',
      created: item.created?.toString() || Math.floor(Date.now() / 1000).toString(),
      status: item.status?.toString() || '1',
      type: item.type || 'page',
      body: item.body || ''
    };
  }, []);

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
        
        console.log(`Fetching content via backend proxy for: ${site.site_url}`);
        
        // Use the structure endpoint which was working before
        const response = await axios.get(
          `${apiBaseUrl}/drupal7/structure`,
          {
            params: { 
              endpoint: site.site_url,
              _t: Date.now() // Cache buster
            },
            timeout: 30000,
          }
        );

        console.log('Response data:', response.data);
        
        if (response.data) {
          let data = [];
          
          // Handle the structure property in the response
          if (response.data.structure && Array.isArray(response.data.structure)) {
            // Extract the structure array
            data = response.data.structure;
            console.log('Extracted content from structure property:', data);
          } 
          // Fallback to other possible response formats
          else if (Array.isArray(response.data)) {
            data = response.data;
          } else if (response.data.data) {
            data = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          } else if (response.data.items) {
            data = Array.isArray(response.data.items) ? response.data.items : [response.data.items];
          } else if (typeof response.data === 'object') {
            // If it's a single object, wrap it in an array
            data = [response.data];
          }
          
          console.log('Processed data:', data);
          
          if (data.length > 0) {
            try {
              // Map each item in the structure array to a content node
              const contentNodes = data.map(item => {
                // Ensure required fields have default values
                return {
                  nid: item.nid?.toString() || '',
                  title: item.title?.toString() || 'Untitled',
                  created: item.created?.toString() || Math.floor(Date.now() / 1000).toString(),
                  status: item.status?.toString() || '1',
                  type: item.type?.toString() || 'page',
                  body: item.body?.toString() || ''
                };
              });
              setContent(contentNodes);
            } catch (formatError) {
              console.error('Error formatting content nodes:', formatError);
              setError(`Error processing content: ${formatError.message}`);
              setContent(mockContent); // Fall back to mock data
            }
          } else {
            console.warn('No content found in response.data:', response.data);
            setError('No content found in the response. The Drupal site may not have any content or the endpoint may be incorrect.');
            setContent(mockContent); // Fall back to mock data
          }
        } else {
          console.warn('Unexpected response format:', response.data);
          throw new Error('Unexpected response format from server');
        }
        
      } catch (err) {
        console.error('Error loading content:', err);
        const errorMessage = axios.isAxiosError(err) 
          ? `Failed to load content: ${err.response?.data?.error || err.message}`
          : err instanceof Error 
            ? err.message 
            : 'Failed to load content. Please try again later.';
            
        setError(errorMessage);
        setContent([]);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [site.id, site.site_url, formatContentNode]);
  
  // Mock data for development
  const mockContent: ContentNode[] = [
    {
      nid: '1',
      title: 'Sample Article',
      created: Math.floor(Date.now() / 1000 - 86400).toString(), // Yesterday
      status: '1',
      type: 'article',
      body: '<p>This is a sample article content. In a real scenario, this would be loaded from your Drupal site.</p>'
    },
    {
      nid: '2',
      title: 'Another Sample Page',
      created: Math.floor(Date.now() / 1000 - 172800).toString(), // 2 days ago
      status: '1',
      type: 'page',
      body: '<p>This is another sample content item showing different types of content that might exist in your Drupal site.</p>'
    }
  ];

  const toggleExpand = (nid: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nid)) {
        newSet.delete(nid);
      } else {
        newSet.add(nid);
      }
      return newSet;
    });
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  const cleanBodyText = (html: string): string => {
    if (!html) return '';
    
    try {
      // Create a temporary div element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Remove script and style elements
      const scripts = tempDiv.getElementsByTagName('script');
      const styles = tempDiv.getElementsByTagName('style');
      
      Array.from(scripts).forEach(script => script.remove());
      Array.from(styles).forEach(style => style.remove());
      
      // Get the text content and clean it up
      let text = tempDiv.textContent || tempDiv.innerText || '';
      
      // Normalize whitespace and trim
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
        
      return text;
    } catch (err) {
      console.error('Error cleaning HTML:', err);
      return html; // Return original if parsing fails
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          <p className="text-gray-400">Loading content...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-[#1F2937] border border-red-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start text-gray-200">
            <svg className="w-5 h-5 mr-3 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Could not load content</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (content.length === 0) {
      return (
        <div className="bg-[#344054] p-4 rounded-lg border border-gray-600 text-center">
          <p className="text-gray-400 italic">No content found for this site.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.map((node) => (
          <div 
            key={node.nid} 
            className="bg-[#344054] p-4 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
          >
            <h3 className="font-bold text-sm text-teal-400 truncate">{node.title}</h3>
            <div className="text-xs text-gray-400 mb-2">
              {formatDate(node.created)} | {node.type} | {node.status === "1" ? "Published" : "Unpublished"}
            </div>
            <div className="text-gray-300 text-sm line-clamp-3">
              {cleanBodyText(node.body)}
            </div>
            {cleanBodyText(node.body).split('\n').length > 3 && (
              <button
                onClick={() => toggleExpand(node.nid)}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {expandedNodes.has(node.nid) ? 'Show less' : 'Read more...'}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2D3748] rounded-lg p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            Content Preview: {site.site_name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-900/20 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong>Site preview showing content from your site
          </p>
        </div>

        <div className="overflow-y-auto flex-1 pr-2">
          {renderContent()}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors text-sm font-medium"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;