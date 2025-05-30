// src/components/Chat/ChatMessage.tsx
import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Helper function to get CMS icon path
const getCmsIcon = (cmsName: string): string => {
  const icons: Record<string, string> = {
    'drupal': '/icons/drupal.png',
    'wordpress': '/icons/wordpress.png',
    'joomla': '/icons/joomla.png',
  };
  return icons[cmsName.toLowerCase()] || '/icons/default-cms.png';
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const messageColor = message.sender === 'user' 
    ? 'bg-teal-600 rounded-br-none' 
    : 'bg-teal-700 rounded-bl-none';
  
  const statusColor = message.status === 'error' ? 'text-red-400' : 'text-gray-400';

  // Get the appropriate outer card title based on message type
  const getOuterCardTitle = () => {
    if (message.type === 'vectorization' && message.vectorizationResults) {
      return `${message.vectorizationResults.objectsCreated} objects have been vectorized`;
    }
    return message.text;
  };

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${messageColor}`}>
        {/* Outer Card Title */}
        <div className="text-sm font-medium mb-2">{getOuterCardTitle()}</div>
        
        {/* Site card if present */}
        {message.site && (
          <div className={`mt-2 ${message.type === 'vectorization' ? 'bg-blue-700 border border-blue-500' : 'bg-teal-900/30 border border-teal-800/50'} p-3 rounded-md relative`}>
            {/* Large top-right CMS Icon */}
            <div className="absolute top-2 right-2">
              <img 
                src={getCmsIcon(message.site.cms)} 
                alt={`${message.site.cms} icon`}
                className="w-16 h-14 object-contain"
              />
            </div>
            
            {/* Site Name and Details */}
            <div className="pr-12">
              <div className="font-semibold text-base">{message.site.name}</div>
              <div className="text-xs opacity-80 mb-1">
                {message.site.cms} Site
              </div>
              
              {/* Description with conditional rendering */}
              {message.site.description && (
                <div className="text-xs mb-2 text-blue-100">
                  {message.site.description}
                </div>
              )}

              {/* Vectorization Results */}
              {message.type === 'vectorization' && message.vectorizationResults && (
                <div className="mt-2 bg-blue-600 p-2 rounded border border-blue-400">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-blue-100 text-sm font-medium">
                      {message.vectorizationResults.objectsCreated} objects vectorized
                    </span>
                  </div>
                </div>
              )}
              
              {/* Visit Site Link */}
              <a 
                href={message.site.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-blue-100 text-sm flex items-center mt-2"
              >
                Visit Site
                <svg
                  className="w-3 h-3 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        )}
        
        {/* Message status */}
        <div className={`text-xs mt-1 flex justify-end items-center ${statusColor}`}>
          {message.sender === 'user' ? 'You' : 'Intelligensi.ai'}
          {message.status === 'sending' && (
            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
          )}
        </div>
      </div>
    </div>
  );
};