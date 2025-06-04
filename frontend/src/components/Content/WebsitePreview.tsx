import React, { useState, useEffect, useMemo } from 'react';
import { fetchDrupalContent, ContentNode as DrupalContentNode } from '../Lib/fetchDrupalContent';
import { ISite } from '../../types/sites';
// Using text fallbacks for icons to avoid type issues

type WebsitePreviewProps = {
  site: {
    id: string;
    name: string;
    url: string;
    site_url?: string;
  };
  onClose: () => void;
};

// Helper function to format text with paragraph breaks after every 100 words following full stops
const formatTextWithBreaks = (text: string): string => {
  if (!text) return '';
  
  // Extract text content from HTML if needed
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  const plainText = tempDiv.textContent || text;
  
  // Split into sentences
  const sentences = plainText.split(/(?<=\.)/g);
  let result = '';
  let wordCount = 0;
  let currentParagraph = '';
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    wordCount += words.length;
    currentParagraph += sentence;
    
    // Add paragraph break after ~100 words at sentence boundaries
    if (wordCount >= 100 && /[.!?]\s*$/.test(sentence)) {
      result += currentParagraph.trim() + '\n\n';
      currentParagraph = '';
      wordCount = 0;
    }
  }
  
  // Add any remaining content
  if (currentParagraph.trim()) {
    result += currentParagraph.trim();
  }
  
  return result;
};

// Helper function to get HTML from content body
const getBodyHtml = (body: unknown): string => {
  if (!body) return '';
  
  try {
    if (typeof body === 'string') return formatTextWithBreaks(body);
    if (typeof body === 'object' && body !== null && 'value' in body) {
      return formatTextWithBreaks(String(body.value));
    }
    return formatTextWithBreaks(JSON.stringify(body));
  } catch (err) {
    console.error('Error parsing body content:', err);
    return '';
  }
};

interface ContentState {
  isExpanded: boolean;
  truncatedText: string;
  fullText: string;
  showReadMore: boolean;
}

const WebsitePreview: React.FC<WebsitePreviewProps> = ({ site: siteProp, onClose }) => {
  // State management
  const [content, setContent] = useState<DrupalContentNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<DrupalContentNode | null>(null);
  const [contentState, setContentState] = useState<ContentState>({
    isExpanded: false,
    truncatedText: '',
    fullText: '',
    showReadMore: false
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fetch content when component mounts
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create a site object that matches the ISite interface expected by fetchDrupalContent
        const siteData: ISite = {
          id: parseInt(siteProp.id) || 0,
          user_id: 'preview-user', // Default user ID for preview
          site_name: siteProp.name || 'Preview Site',
          site_url: siteProp.site_url || siteProp.url,
          cms: {
            id: 1,
            name: 'drupal',
            version: '7',
            is_active: true,
            has_migrations: false
          },
          is_active: true,
          is_selected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const fetchedContent = await fetchDrupalContent(siteData);
        setContent(fetchedContent);
        
        // Set the first content item as active if available
        if (fetchedContent.length > 0) {
          setActiveContent(fetchedContent[0]);
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : 'An error occurred while fetching content'
        );
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [siteProp]);

  // Group content by type for navigation
  const contentByType = useMemo(() => {
    return content.reduce<Record<string, DrupalContentNode[]>>((acc, node) => {
      const type = node.type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(node);
      return acc;
    }, {});
  }, [content]);

  // Get preview text for content items
  const getPreviewText = (body: unknown): string => {
    const text = getBodyHtml(body);
    if (!text) return '';
    
    // Simple text extraction without DOM manipulation
    const cleanText = String(text)
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/\s+/g, ' ')      // Collapse whitespace
      .trim();
      
    return cleanText.length > 150
      ? `${cleanText.substring(0, 150).trim()}...`
      : cleanText;
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Set first content item as active when content loads
  useEffect(() => {
    if (content.length > 0 && !activeContent) {
      setActiveContent(content[0]);
    }
  }, [content, activeContent]);
  
  // Process content when active content changes
  useEffect(() => {
    if (activeContent?.body) {
      const fullText = getBodyHtml(activeContent.body);
      const words = fullText.split(/\s+/);
      
      if (words.length > 400) {
        // Find a good breaking point after ~400 words
        let truncatedAt = 400;
        // Look for the next sentence end after 400 words
        for (let i = 400; i < Math.min(450, words.length); i++) {
          if (/[.!?]\s*$/.test(words[i])) {
            truncatedAt = i + 1;
            break;
          }
        }
        const truncatedText = words.slice(0, truncatedAt).join(' ');
        setContentState({
          isExpanded: false,
          truncatedText,
          fullText,
          showReadMore: true
        });
      } else {
        setContentState({
          isExpanded: true,
          truncatedText: fullText,
          fullText,
          showReadMore: false
        });
      }
    } else {
      setContentState({
        isExpanded: false,
        truncatedText: '',
        fullText: '',
        showReadMore: false
      });
    }
  }, [activeContent]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-lg text-text-primary">Loading content...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-400 mb-2">Error loading content</p>
          <p className="text-text-primary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (content.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <p className="text-lg text-text-primary mb-4">No content available for {siteProp.name || 'this site'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }



  // Main content render
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <span className="text-lg">{isFullscreen ? '⤵️' : '⤴️'}</span>
              </button>
              <span className="text-sm font-medium text-gray-500 hidden sm:block">
                Previewing: <span className="text-gray-900">{siteProp.name}</span>
              </span>
            </div>
            
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all duration-200 hover:shadow-md"
            >
              <span className="mr-2">✕</span>
              <span className="hidden sm:inline">Exit Preview</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Gradient Overlay */}
      <div className="relative h-80 md:h-96 overflow-hidden bg-gradient-to-r from-indigo-900 to-purple-800">
        <div 
          className="absolute inset-0 bg-cover bg-center transform transition-transform duration-1000 hover:scale-105"
          style={{
            backgroundImage: 'url(/images/PreviewImages/spaceBanner.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.7
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          <div className="h-full flex flex-col justify-end pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in-up">
              {siteProp.name || 'Your Website'}
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Welcome to your modern website preview. Explore the content below.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="px-6 py-3 bg-white text-indigo-700 font-medium rounded-full hover:bg-indigo-50 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5">
                Get Started
              </button>
              <button className="px-6 py-3 border-2 border-white text-white font-medium rounded-full hover:bg-white/10 transition-all duration-200">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs with Glass Effect */}
      <div className="relative z-10 -mt-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-2 p-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
            {Array.from(new Set(content.map(item => item.type))).map((type) => (
              <button
                key={type}
                onClick={() => {
                  const typeContent = content.filter(item => item.type === type);
                  if (typeContent.length > 0) {
                    setActiveContent(typeContent[0]);
                  }
                }}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                  activeContent?.type === type 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full lg:w-72 flex-shrink-0">
              <div className="w-full md:w-64 flex-shrink-0 bg-white/80 backdrop-blur-sm border-r border-gray-100 overflow-y-auto">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {activeContent?.type ? `${activeContent.type}s` : 'Content Pages'}
                  </h3>
                </div>
                <nav className="divide-y divide-gray-100">
                  {content
                    .filter(item => activeContent?.type ? item.type === activeContent.type : true)
                    .map((item) => (
                      <div
                        key={item.nid}
                        onClick={() => setActiveContent(item)}
                        className={`p-4 cursor-pointer transition-all duration-150 ${
                          activeContent?.nid === item.nid 
                            ? 'bg-indigo-50/50 border-l-4 border-indigo-500' 
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <h4 className={`text-sm font-medium ${
                          activeContent?.nid === item.nid ? 'text-indigo-700' : 'text-gray-800'
                        }`}>
                          {item.title || 'Untitled'}
                        </h4>
                        {item.body && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {getPreviewText(item.body)}
                          </p>
                        )}
                      </div>
                    ))}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className="p-6 md:p-8">
                  {activeContent?.title && (
                    <h2 className="text-md lmd:text-md font-light text-gray-900 mb-4 pb-3 border-b border-gray-100">
                      {activeContent.title}
                    </h2>
                  )}
                  <div className="prose max-w-none">
                    {activeContent?.body ? (
                      <div className="text-gray-700 text-xs leading-relaxed">
                        {(contentState.isExpanded ? contentState.fullText : contentState.truncatedText)
                          .split('\n\n')
                          .map((paragraph, idx, arr) => (
                            <p key={idx} className="mb-4 last:mb-0">
                              {paragraph}
                              {!contentState.isExpanded && 
                               contentState.showReadMore && 
                               idx === arr.length - 1 && 
                               '...'}
                            </p>
                          ))}
                        {contentState.showReadMore && (
                          <button
                            onClick={() => setContentState(prev => ({
                              ...prev,
                              isExpanded: !prev.isExpanded
                            }))}
                            className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center"
                          >
                            {contentState.isExpanded ? (
                              <>
                                <span>Show less</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </>
                            ) : (
                              <>
                                <span>Read more</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="text-gray-400 mb-3">
                          <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-medium text-gray-700">No content available</h3>
                        <p className="mt-1 text-sm text-gray-500">Select an item from the sidebar to view its content</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-xl font-bold mb-4">{siteProp.name || 'Website Preview'}</h3>
              <p className="text-gray-300 text-sm">
                This is a preview of your website. All content is for demonstration purposes only.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {content.slice(0, 4).map((item) => (
                  <li key={item.nid}>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveContent(item);
                      }}
                      className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                    >
                      {item.title || 'Untitled'}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Preview</h4>
              <p className="text-sm text-gray-400 mb-4">
                You're currently viewing a preview of your website.
              </p>
              <button
                onClick={onClose}
                className="text-sm font-medium text-white hover:text-indigo-300 transition-colors duration-200 flex items-center"
              >
                Exit Preview Mode
                <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-xs text-gray-400 text-center">
              &copy; {new Date().getFullYear()} {siteProp.name || 'Website Preview'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WebsitePreview;
