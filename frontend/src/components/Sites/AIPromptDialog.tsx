import React, { useState } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
      // Call the Weaviate search function
      const searchWeaviate = httpsCallable(functions, 'searchWeaviate');
      const result = await searchWeaviate({ 
        query: prompt,
        siteId: siteId.toString(),
        userId: currentUser?.uid
      });

      // @ts-ignore - TypeScript doesn't know the shape of the result
      const searchResults = result.data.results;
      
      if (searchResults && searchResults.length > 0) {
        // @ts-ignore - TypeScript doesn't know the shape of the result
        setResponse(searchResults[0]._additional.generate.singleResult || 'No results found');
      } else {
        setResponse('No matching results found.');
      }
    } catch (err: any) {
      console.error('Error searching Weaviate:', err);
      setError(err.message || 'Failed to get response. Please try again.');
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
