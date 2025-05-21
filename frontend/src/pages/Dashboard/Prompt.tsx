import React, { useState } from "react";
import { useVoiceRecognition } from "../../components/Utils/VoiceRecogition";
import { MicrophoneButton } from "../../components/Utils/MicrophoneButton";

interface PromptProps {
  onSend: (query: string) => Promise<void>;
  disabled: boolean;
  error?: string | null;
  success?: string | null;
}

const Prompt: React.FC<PromptProps> = ({ onSend, disabled, error: parentError, success: parentSuccess }) => {
  const [query, setQuery] = useState<string>("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalSuccess, setInternalSuccess] = useState<string | null>(null);

  const localHandleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInternalError(null);
    setInternalSuccess(null);

    try {
      await onSend(query);
      setQuery("");
    } catch (err: any) {
      setInternalError(err.message || "Failed to send prompt");
    }
  };

  const {
    isListening,
    startListening,
    stopListening
  } = useVoiceRecognition({
    setQuery,
    handleSubmit: localHandleSubmit,
  });

  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="bg-[#1C1F2B] p-1 pt-1 rounded-md flex flex-col gap-2">
      <form onSubmit={localHandleSubmit} className="flex flex-row items-center gap-2 flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Please ask a question to intelligensi.ai"
          className="flex-1 px-4 py-3 rounded-full text-sm text-gray-500 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          disabled={disabled || isListening}
        />
        <MicrophoneButton
          isListening={isListening}
          onClick={handleMicrophoneClick}
          className="w-10 h-10"
        />
        <button
          type="submit"
          className={`px-4 py-2 bg-teal-400 text-white rounded-full hover:bg-teal-500 transition ${
            (disabled || isListening) ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={disabled || isListening}
        >
          Send
        </button>
      </form>

      {(parentError || internalError) && (
        <div className="text-red-500 text-sm mt-2">{parentError || internalError}</div>
      )}
      {(parentSuccess || internalSuccess) && (
        <div className="text-green-500 text-sm mt-2">{parentSuccess || internalSuccess}</div>
      )}
    </div>
  );
};

export default Prompt;
