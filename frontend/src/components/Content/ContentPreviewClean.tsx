import React, { useState, useEffect } from 'react';
import { ISite } from '../../types/sites';
import mockContent from '../../mock/drupalContent';

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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setContent(mockContent);
    setLoading(false);
  }, []);

  const toggleExpand = (nid: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      newSet.has(nid) ? newSet.delete(nid) : newSet.add(nid);
      return newSet;
    });
  };

  const formatDate = (timestamp: string) => {
    try {
      return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            Content Preview: {site.site_name || site.cms?.name || 'Untitled Site'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-1 gap-4">
            {content.map((node) => (
              <div key={node.nid} className="border p-4 rounded">
                <h3 className="font-bold">{node.title}</h3>
                <div className="text-sm text-gray-500 mb-2">
                  {formatDate(node.created)} • {node.type}
                </div>
                <div className="text-gray-700">
                  {node.body.length > 200 && !expandedNodes.has(node.nid)
                    ? `${node.body.substring(0, 200)}...`
                    : node.body}
                  {node.body.length > 200 && (
                    <button
                      onClick={() => toggleExpand(node.nid)}
                      className="text-blue-500 hover:underline ml-1"
                    >
                      {expandedNodes.has(node.nid) ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;
