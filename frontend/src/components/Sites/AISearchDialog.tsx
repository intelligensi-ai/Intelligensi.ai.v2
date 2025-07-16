import React, { useState } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';

interface AISearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: number;
  currentUser: any;
}

const AISearchDialog: React.FC<AISearchDialogProps> = ({ 
  isOpen, 
  onClose, 
  siteId, 
  currentUser 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setResults([]);
    setSelectedResult(null);

    try {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const endpoint = isDevelopment 
        ? 'http://localhost:5001/intelligensi-ai-v2/us-central1/simpleSearch'
        : 'https://us-central1-intelligensi-ai-v2.cloudfunctions.net/simpleSearch';
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth header in production
      if (!isDevelopment) {
        const user = getAuth().currentUser;
        if (!user) {
          throw new Error('You need to be logged in to use this feature');
        }
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          limit: 5
        })
      });

      const responseData = await response.json();

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
        setResults(responseData.results);
        setSelectedResult(responseData.results[0]);
      } else {
        setResults([]);
        setError('No matching results found. Try rephrasing your query.');
      }
    } catch (err: unknown) {
      console.error('Error in handleSearch:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A202C] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-200">AI-Powered Search</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="mb-4">
              <label htmlFor="search-query" className="block text-sm font-medium text-gray-300 mb-2">
                Search your content
              </label>
              <div className="relative">
                <input
                  id="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                  placeholder="Ask a question or search for content..."
                  disabled={isLoading}
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-400"></div>
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors flex items-center gap-2 ${
                  isLoading || !query.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? 'Searching...' : 'Search'}
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

          {results.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-indigo-400">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </span>
                <div className="h-px bg-gray-700 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Results list */}
                <div className="space-y-2 md:col-span-1">
                  {results.map((result, index) => (
                    <div 
                      key={index}
                      onClick={() => setSelectedResult(result)}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedResult === result 
                          ? 'bg-indigo-900/50 border-l-4 border-indigo-500' 
                          : 'bg-gray-800 hover:bg-gray-700/50'
                      }`}
                    >
                      <h4 className="font-medium text-sm text-gray-200 truncate">
                        {result.title || `Result ${index + 1}`}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {result.body || 'No content preview available'}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Selected result detail */}
                <div className="md:col-span-2">
                  <div className="bg-gray-800 p-4 rounded-md border border-gray-700 h-full">
                    {selectedResult ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">
                          {selectedResult.title || 'No title'}
                        </h3>
                        <div className="prose prose-invert max-w-none text-gray-300 text-sm">
                          {selectedResult.body || 'No content available'}
                        </div>
                        {selectedResult.distance !== undefined && (
                          <div className="mt-4 text-xs text-gray-400">
                            <span>Relevance: </span>
                            <span className="font-mono">
                              {(1 - (selectedResult.distance || 0)).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-8">
                        Select a result to view details
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISearchDialog;
