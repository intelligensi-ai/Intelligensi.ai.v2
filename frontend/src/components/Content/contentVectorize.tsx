import React, { useState } from 'react';
import axios from 'axios';

interface VectorizeProps {
  onComplete: () => void;
  onError: (message: string) => void;
}

const Vectorize: React.FC<VectorizeProps> = ({ onComplete, onError }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Hardcoded test objects that match your schema
  const testObjects = [
    {
      nid: '1',
      title: 'Test Node 1',
      body: 'This is a test body for node 1.',
      created: '2023-01-01',
      status: 'published',
      type: 'article',
    },
    {
      nid: '2',
      title: 'Test Node 2',
      body: 'This is a test body for node 2.',
      created: '2023-01-02',
      status: 'published',
      type: 'blog',
    }
  ];

  const handleVectorize = async () => {
    try {
      setLoading(true);
      setProgress(0);

      // Prepare payload with hardcoded objects
      const payload = {
        objects: testObjects.map(obj => ({
          class: 'IntelligensiAi', // Ensure case matches your schema
          properties: {
            nid: obj.nid,
            title: obj.title,
            body: obj.body,
            created: obj.created,
            status: obj.status,
            type: obj.type
          }
        }))
      };

      // Send to Weaviate
      const response = await axios.post(
        'http://localhost:5001/intelligensi-ai-v2/us-central1/writeWeaviate',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          },
        }
      );

      console.log('Vectorization successful:', response.data);
      onComplete();
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
        <h2 className="text-xl font-bold text-white">Vectorize Content to Weaviate</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {testObjects.map((obj) => (
          <div key={obj.nid} className="bg-[#344054] p-3 rounded border border-gray-600">
            <h3 className="font-bold text-teal-400 truncate">{obj.title}</h3>
            <p className="text-gray-300 text-sm line-clamp-2">{obj.body}</p>
            <div className="text-xs text-gray-400 mt-1">
              {obj.type} | {obj.nid}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
        <button
          onClick={handleVectorize}
          disabled={loading}
          className={`px-4 py-2 rounded text-white transition-colors ${
            loading 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-teal-600 hover:bg-teal-500'
          }`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Vectorize Test Content'
          )}
        </button>
      </div>
    </div>
  );
};

export default Vectorize;