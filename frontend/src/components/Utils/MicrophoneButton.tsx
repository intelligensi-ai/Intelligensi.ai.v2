import React from 'react';

interface MicrophoneButtonProps {
  isListening: boolean;
  onClick: () => void;
  className?: string;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ 
  isListening, 
  onClick, 
  className = '' 
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-full focus:outline-none ${
        isListening 
          ? 'bg-red-500 animate-pulse' 
          : 'bg-gray-600 hover:bg-gray-500'
      } ${className}`}
      aria-label={isListening ? 'Stop listening' : 'Start voice recognition'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fillRule="evenodd"
          d="M8.25 3.75A3.75 3.75 0 0112 0a3.75 3.75 0 013.75 3.75v7.5a3.75 3.75 0 01-7.5 0v-7.5z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z"
          clipRule="evenodd"
        />
        <path d="M13.5 16.455a6 6 0 01-3.5 1.045V21a.75.75 0 001.5 0v-3.5a6 6 0 012-4.545z" />
      </svg>
    </button>
  );
};