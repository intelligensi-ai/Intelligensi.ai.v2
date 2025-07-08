import React, { useState } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

interface AIPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: number;
  currentUser: any;
}

const AIPromptDialog: React.FC<AIPromptDialogProps> = ({ 
  isOpen, 
  onClose, 
  siteId, 
  currentUser 
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      // For development, we'll skip authentication
      const isDevelopment = process.env.NODE_ENV === 'development';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only add auth header in production
      if (!isDevelopment) {
        const user = getAuth().currentUser;
        if (!user) {
          throw new Error('You need to be logged in to use this feature');
        }
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Sending search request...');
      const endpoint = isDevelopment 
        ? 'http://localhost:5001/intelligensi-ai-v2/us-central1/simpleSearch'
        : 'https://us-central1-intelligensi-ai-v2.cloudfunctions.net/simpleSearch';
      
      const requestBody = {
        query: prompt,
        limit: 3
      };

      console.log('Request details:', { endpoint, body: requestBody });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json().catch(err => ({
        error: `Failed to parse response: ${err.message}`
      }));

      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(
          responseData.error || 
          responseData.message || 
          `Request failed with status ${response.status}`
        );
      }

      if (!responseData.success) {
        throw new Error(responseData.error || 'Search was not successful');
      }
      
      if (responseData.results?.length > 0) {
        // Use the first result's body as the response
        const firstResult = responseData.results[0];
        console.log('First result:', firstResult);
        setResponse(firstResult.body || firstResult._additional?.body || 'No content available');
      } else {
        setResponse('No matching results found. Try rephrasing your question.');
      }
    } catch (err: unknown) {
      console.error('Error in handleSubmit:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error searching Weaviate:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A202C] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-200">AI Assistant</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="mb-4">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                Ask about this site
              </label>
              <div className="relative">
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 text-gray-100 rounded-md h-32 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                  placeholder="Type your question here..."
                  disabled={isLoading}
                  required
                  rows={4}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {prompt.length}/1000
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors flex items-center gap-2 ${
                  isLoading || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading || !prompt.trim()}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    Ask AI
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {response && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-indigo-400">Response</span>
                <div className="h-px bg-gray-700 flex-1"></div>
              </div>
              <div className="bg-gray-800 p-4 rounded-md border border-gray-700 text-gray-200 whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPromptDialog;
