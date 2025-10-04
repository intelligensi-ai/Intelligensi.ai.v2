import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/functionsApi';
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

interface VectorizeProps {
  site: ISite;
  onComplete: (result: { objectsCreated: number; siteName: string }) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

const Vectorize: React.FC<VectorizeProps> = ({ site, onComplete, onError, onClose }) => {
  const [content, setContent] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fetchingContent, setFetchingContent] = useState(false);
  const [contentCount, setContentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Format content node from Drupal API response
  const formatContentNode = useCallback((item: any): ContentNode => {
    // Handle different Drupal API response formats
    const bodyContent = item.body?.[0]?.value ||
                      item.body?.[0]?.processed ||
                      item.body ||
                      item.field_body?.[0]?.value ||
                      item.content?.[0]?.value ||
                      '';
    
    return {
      nid: item.nid?.toString() || '',
      title: item.title || item.label || 'Untitled',
      created: item.created?.toString() || Math.floor(Date.now() / 1000).toString(),
      status: item.status?.toString() || '1',
      type: item.type || 'page',
      body: bodyContent
    };
  }, []);

  // Fetch content from Drupal when component mounts
  useEffect(() => {
    const loadContent = async () => {
      if (!site?.site_url) {
        setError('No site URL available');
        setFetchingContent(false);
        return;
      }

      try {
        setFetchingContent(true);
        setError(null);
        
        // Use the backend proxy to avoid CORS issues
        const apiBaseUrl = getApiBaseUrl();
        
        console.log(`[Vectorize] Fetching content via backend proxy for: ${site.site_url}`);
        
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

        console.log('[Vectorize] Response data:', response.data);
        
        if (response.data) {
          let data = [];
          
          // Handle the structure property in the response
          if (response.data.structure && Array.isArray(response.data.structure)) {
            // Extract the structure array
            data = response.data.structure;
            console.log('[Vectorize] Extracted content from structure property:', data);
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
          
          console.log('[Vectorize] Processed data:', data);
          
          if (data.length > 0) {
            const formattedNodes = data.map(formatContentNode) as ContentNode[];
            if (formattedNodes.length === 0) {
              setError('No content available to vectorize from this site.');
              return;
            }
            setContent(formattedNodes);
            setContentCount(formattedNodes.length);
          } else {
            throw new Error('No content found in the response');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch Drupal content:', err);
        setError('Could not connect to the site. Please check your connection and try again.');
        onError('Could not fetch Drupal content');
      } finally {
        setFetchingContent(false);
      }
    };

    loadContent();
  }, [site, formatContentNode, onError]);

  const cleanBodyText = (text: string) => {
    if (!text) return '';
    
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    let cleaned = textArea.value;

    cleaned = cleaned
      .replace(/<[^>]*>?/gm, '')
      .replace(/\\(r|n|"|')/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  };

  const preparePayload = (nodes: ContentNode[]) => ({
    objects: nodes.map((node) => ({
      class: 'IntelligensiAi',
      properties: {
        nid: node.nid,
        title: node.title,
        body: cleanBodyText(node.body),
        created: node.created,
        status: node.status === "1" ? "published" : "unpublished",
        type: node.type,
      },
    })),
  });

  const handleVectorize = async () => {
    try {
      if (!content.length) {
        setError('No content available to vectorize');
        return;
      }
  
      setLoading(true);
      setProgress(0);
      setError(null);
  
      // Process in batches to avoid overwhelming the server
      const batchSize = 5;
      let successfulCount = 0;
  
      for (let i = 0; i < content.length; i += batchSize) {
        const batch = content.slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
          const node = batch[j];
          try {
            const payload = preparePayload([node]);
            
            const apiBaseUrl = getApiBaseUrl();

            await axios.post(
              `${apiBaseUrl}/writeWeaviate`,
              payload,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
  
            successfulCount++;
          } catch (error) {
            console.error(`Failed to vectorize item ${node.nid}:`, error);
          } finally {
            const processedCount = i + j + 1;
            const newProgress = Math.round((processedCount / content.length) * 100);
            setProgress(newProgress);
          }
        }
      }
  
      onComplete({ 
        objectsCreated: successfulCount,
        siteName: site.site_name
      });
    } catch (error) {
      console.error('Vectorization error:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to vectorize content';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If there's an error, show error dialog
  if (error) {
    return (
      <div className="bg-[#2D3748] rounded-lg p-6 w-full ">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Error</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bg-[#1F2937] border border-red-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start text-gray-200">
            <svg className="w-5 h-5 mr-3 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2D3748] rounded-lg  max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          Adding to AI memory content from {site.site_name}
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-teal-400">Progress</span>
          <span className="text-sm text-gray-400">{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-teal-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto">
        {content.slice(0, 6).map((node) => (
          <div key={node.nid} className="bg-[#344054] p-3 rounded border border-gray-600">
            <h3 className="font-bold text-sm text-teal-400 truncate">{node.title}</h3>
            <p className="text-gray-300 text-sm line-clamp-2">
              {cleanBodyText(node.body)}
            </p>
            <div className="text-xs text-gray-400 mt-1">
              {node.type} | {node.nid}
            </div>
          </div>
        ))}
        {content.length > 6 && (
          <div className="bg-[#344054] p-3 rounded border border-gray-600 flex items-center justify-center">
            <span className="text-gray-400">
              +{content.length - 6} more items
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleVectorize}
          disabled={loading || fetchingContent || !content.length}
          className={`px-4 py-2 rounded text-white transition-colors ${
            loading || fetchingContent || !content.length
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-teal-600 hover:bg-teal-500'
          }`}
        >
          {fetchingContent ? (
            'Loading Content...'
          ) : loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Vectorizing...
            </span>
          ) : (
            `Vectorize ${contentCount} Items`
          )}
        </button>
      </div>
    </div>
  );
};

export default Vectorize;