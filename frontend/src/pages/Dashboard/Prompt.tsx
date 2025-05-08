import React, { useState } from "react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError(null);
    setInternalSuccess(null);

    try {
      await onSend(query);
      setQuery("");
    } catch (err: any) {
      setInternalError(err.message || "Failed to send prompt");
    }
  };

  return (
    <div className="bg-[#2D3748] p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-bold mb-4">AI Assistant</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask something or trigger a migration..."
            className="flex-1 px-4 py-2 rounded-l bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
            disabled={disabled}
          />
          <button
            type="submit"
            className={`bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-r ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={disabled}
          >
            {disabled ? "Sending..." : "Submit"}
          </button>
        </div>
        
        {(parentError || internalError) && (
          <div className="text-red-500 text-sm mt-2">
            {parentError || internalError}
          </div>
        )}
        
        {(parentSuccess || internalSuccess) && (
          <div className="text-green-500 text-sm mt-2">
            {parentSuccess || internalSuccess}
          </div>
        )}
      </form>
    </div>
  );
};

export default Prompt;