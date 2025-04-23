import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchDrupalContent, ContentNode } from '../Lib/fetchDrupalContent';
import { ICMS, ISite } from '../../types/sites';

interface VectorizeProps {
  onComplete: (count: number) => void;
  onError: (message: string) => void;
}

const Vectorize: React.FC<VectorizeProps> = ({ onComplete, onError }) => {
  const [content, setContent] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fetchingContent, setFetchingContent] = useState(false);
  const [contentCount, setContentCount] = useState(0);

  // Hardcoded site data with proper typing
  const hardcodedSite: ISite = {
    site_url: 'https://drupal7.intelligensi.online',
    site_name: 'Intelligensi',
    user_id: 12345,
    cms: {
      name: 'Drupal',
      is_active: true,
      has_migrations: false
    }
  };

  // Fetch content from Drupal when component mounts
  useEffect(() => {
    const loadContent = async () => {
      try {
        setFetchingContent(true);
        const nodes = await fetchDrupalContent(hardcodedSite);
        setContent(nodes);
        setContentCount(nodes.length);
      } catch (err) {
        console.error('Failed to fetch Drupal content:', err);
        onError('Could not fetch Drupal content');
      } finally {
        setFetchingContent(false);
      }
    };

    loadContent();
  }, []);

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
        onError('No content available to vectorize');
        return;
      }
  
      setLoading(true);
      setProgress(0);
  
      // Process in batches to avoid overwhelming the server
      const batchSize = 5; // Reduced batch size for smoother progress updates
      let successfulCount = 0;
  
      for (let i = 0; i < content.length; i += batchSize) {
        const batch = content.slice(i, i + batchSize);
        
        // Process each item in the batch using traditional for loop
        for (let j = 0; j < batch.length; j++) {
          const node = batch[j];
          try {
            const payload = preparePayload([node]); // Single item payload
            
            await axios.post(
              'http://localhost:5001/intelligensi-ai-v2/us-central1/writeWeaviate',
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
  
      onComplete(successfulCount);
    } catch (error) {
      console.error('Vectorization error:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to vectorize content';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-[#2D3748] rounded-lg p-6 w-full max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          Vectorize Content from {hardcodedSite.site_name}
        </h2>
        <div className="text-gray-400">
          {contentCount > 0 && `${contentCount} items available`}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-teal-400">Progress</span>
          <span className="text-sm text-gray-400">{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-teal-500 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto">
        {content.slice(0, 6).map((node) => (
          <div key={node.nid} className="bg-[#344054] p-3 rounded border border-gray-600">
            <h3 className="font-bold text-teal-400 truncate">{node.title}</h3>
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