// src/components/Chat/Chat.tsx
import React from 'react';
import { ChatMessage } from '../../types/chat';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';

interface ChatProps {
  messages: ChatMessage[];
}

export const Chat: React.FC<ChatProps> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessageComponent key={message.id} message={message} />
      ))}
    </div>
  );
};