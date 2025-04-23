import { useState } from 'react';

interface UseVoiceRecognitionProps {
  setQuery: (query: string) => void;
  handleSubmit: () => void;
}

export const useVoiceRecognition = ({ setQuery, handleSubmit }: UseVoiceRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Try Chrome or Edge.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      if (timeoutId) clearTimeout(timeoutId);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      
      // Auto-submit after 3 seconds
      const id = setTimeout(() => {
        handleSubmit();
      }, 6000);
      setTimeoutId(id);
    };

    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  return { isListening, startListening, stopListening };
};