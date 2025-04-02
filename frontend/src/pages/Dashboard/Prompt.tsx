// src/components/Prompt/Prompt.tsx
import React, { useState } from 'react'; 
import { useVoiceRecognition } from '../../components/Utils/VoiceRecogition';
import { MicrophoneButton } from '../../components/Utils/MicrophoneButton'; 
// import { ChatMessage } from '../../components/types/chat';

interface PromptProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export const Prompt: React.FC<PromptProps> = ({ onSend, disabled = false }) => {
  const [query, setQuery] = useState<string>('');

  const { isListening, startListening, stopListening } = useVoiceRecognition({
    setQuery: setQuery,
    handleSubmit: async () => {
      if (query.trim()) {
        await onSend(query);
        setQuery('');
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || disabled) return;
    
    await onSend(query);
    setQuery('');
  };

  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-gray-200">
      <div className="flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 text-gray-600 rounded-full bg-gray-100 focus:outline-none"
          disabled={disabled || isListening}
        />
        <div className="flex">
          <MicrophoneButton
            isListening={isListening}
            onClick={handleMicrophoneClick}
            className="rounded-r-none"
            // disabled={disabled}
          />
          <button
            type="submit"
            className={`bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-r-full ${
              disabled || isListening ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={disabled || isListening}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
};