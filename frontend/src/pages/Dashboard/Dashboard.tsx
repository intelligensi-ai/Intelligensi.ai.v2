// src/components/Dashboard/Dashboard.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { Chat } from '../../components/Chat/Chat';
import { Prompt } from './Prompt';
import { ChatMessage } from '../../types/chat';
import Header from './Header';
import InitialDisplay from '../../components/Display/InitialDisplay';
import { AnimatePresence } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (message: string) => {
    setIsLoading(true);
    setError(null);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post(
        "http://localhost:5001/intelligensi-ai-v2/us-central1/updateHomepage",
        { prompt: message },
        { headers: { "Content-Type": "application/json" } }
      );

      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? {...msg, status: 'delivered'} : msg
      ));

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        text: response.data.message,
        sender: 'Intelligensi',
        timestamp: new Date(),
        status: 'delivered'
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? {...msg, status: 'error'} : msg
      ));
      
      const errorMessage = axios.isAxiosError(err) 
        ? err.response?.data?.error || err.message || "Failed to process request"
        : err instanceof Error ? err.message : "Failed to process request";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col relative">
        {/* Chat Content Area */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {/* Initial Display (centered overlay) */}
          <AnimatePresence>
            {messages.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <InitialDisplay show={true} />
              </div>
            )}
          </AnimatePresence>
          
          {/* Chat Messages */}
          <Chat messages={messages} />
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start mt-2">
              <div className="bg-[#2D3748] px-4 py-2 rounded-lg rounded-bl-none max-w-xs">
                <div className="flex items-center text-blue-400">
                  <span className="text-sm">Thinking</span>
                  <span className="ml-2 flex space-x-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Section (always visible) */}
        <div className="bg-[#2D3748] rounded-lg m-4 mt-0 p-4">
          <Prompt onSend={handleSend} disabled={isLoading} />
          {error && (
            <div className="text-red-400 text-sm mt-2">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Sites Section */}
      <div className="bg-[#2D3748] p-4 border-t border-gray-700">
        <h3 className="font-semibold mb-2">Connected Sites</h3>
        <div className="text-sm text-gray-400">
          {messages.length > 0 ? (
            <div>Analysis in progress...</div>
          ) : (
            <div>No sites connected yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};