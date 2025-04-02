// src/components/Chat/ChatMessage.tsx
import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const messageColor = message.sender === 'user' 
    ? 'bg-teal-600 rounded-br-none' 
    : 'bg-teal-700 rounded-bl-none';
  
  const statusColor = message.status === 'error' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${messageColor}`}>
        <div className="text-sm">{message.text}</div>
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