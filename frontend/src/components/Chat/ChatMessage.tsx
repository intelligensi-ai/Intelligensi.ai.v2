// src/components/Chat/ChatMessage.tsx
import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Helper function to get CMS icon path
const getCmsIcon = (cmsName: string): string => {
  const icons: Record<string, string> = {
    'drupal': '/icons/drupal7.png',
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

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${messageColor}`}>
        {/* Regular message text */}
        {message.text && <div className="text-sm">{message.text}</div>}
        
        {/* Site card if present */}
        {message.site && (
          <div className="mt-2 bg-white bg-opacity-10 p-3 rounded-md relative">
            {/* Large top-right CMS Icon */}
            <div className="absolute top-2 right-2">
              <img 
                src={getCmsIcon(message.site.cms)} 
                alt={`${message.site.cms} icon`}
                className="w-16 h-14 object-contain"
              />
            </div>
            
            {/* Site Name and Details */}
            <div className="pr-12"> {/* Add padding to prevent text overlap */}
              <div className="font-semibold text-base">{message.site.name}</div>
              <div className="text-xs opacity-80 mb-1">
                {message.site.cms} Site
              </div>
              
              {/* Description with conditional rendering */}
              {message.site.description && (
                <div className="text-xs mb-2 opacity-75 line-clamp-2">
                  {message.site.description}
                </div>
              )}
              
              {/* Visit Site Link */}
              <a 
                href={message.site.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-teal-300 hover:text-teal-200 text-sm flex items-center"
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