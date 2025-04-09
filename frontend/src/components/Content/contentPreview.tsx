import React, { useState, useEffect } from 'react';
import { ISite } from '../../types/sites';

interface ContentNode {
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

  // Determine the appropriate API endpoint based on environment
  const getApiEndpoint = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5001/intelligensi-ai-v2/us-central1/bulkExport';
    }
    return 'https://us-central1-intelligensi-ai-v2.cloudfunctions.net/bulkExport';
  };

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiEndpoint = getApiEndpoint();
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siteUrl: site.site_url
          }),
          credentials: 'same-origin' // Ensure cookies are sent if needed
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Invalid response format from server');
        }

        setContent(result.data || []);
      } catch (err) {
        console.error('Content fetch error:', err);
        setError(
          err instanceof Error ? 
          err.message : 
          'An unexpected error occurred while fetching content'
        );
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a valid site URL
    if (site?.site_url) {
      fetchContent();
    } else {
      setError('No site URL provided');
      setLoading(false);
    }
  }, [site.site_url]);

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

  const cleanBodyText = (text: string) => {
    if (!text) return '';
    
    // First decode any HTML entities
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    let cleaned = textArea.value;

    // Then remove HTML tags and normalize whitespace
    cleaned = cleaned
      .replace(/<[^>]*>?/gm, '')
      .replace(/\\(r|n|"|')/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  };

  const getPreviewText = (text: string, nid: string) => {
    const cleaned = cleanBodyText(text);
    const lines = cleaned.split('\n');
    return expandedNodes.has(nid) ? lines.join('\n') : lines.slice(0, 3).join('\n');
  };

  const formatDate = (timestamp: string) => {
    try {
      return new Date(parseInt(timestamp) * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#2D3748] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Content Preview: {site.site_name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-2">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
              <p className="text-gray-400">Loading content...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 p-4 bg-[#344054] rounded flex flex-col space-y-2">
              <p className="font-medium">Could not load content</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 self-start"
              >
                Try again
              </button>
            </div>
          ) : content.length === 0 ? (
            <div className="text-gray-400 italic p-4 bg-[#344054] rounded">
              No content found for this site.
            </div>
          ) : (
            <div className="space-y-4 pr-2"> {/* Add padding for scrollbar */}
              {content.map((node) => (
                <div 
                  key={node.nid} 
                  className="bg-[#344054] p-4 rounded-lg border border-gray-600 transition-colors hover:border-gray-500"
                >
                  <h3 className="font-bold text-lg text-teal-400 mb-1">{node.title}</h3>
                  <div className="text-xs text-gray-400 mb-2">
                    {formatDate(node.created)} | {node.type} | {node.status === "1" ? "Published" : "Unpublished"}
                  </div>
                  <div className="text-gray-300 whitespace-pre-line">
                    {getPreviewText(node.body, node.nid)}
                  </div>
                  {cleanBodyText(node.body).split('\n').length > 3 && (
                    <button
                      onClick={() => toggleExpand(node.nid)}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {expandedNodes.has(node.nid) ? 'Show less' : 'Read more...'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-gray-700 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;