import React, { useState } from "react";
import axios from "axios";

const Prompt: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Directly make the OpenAI request without auth
      const response = await axios.post(
        "http://localhost:5001/intelligensi-ai-v2/us-central1/updateHomepage",
        { prompt: query },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      setSuccess(response.data.message);
      setQuery(""); // Clear the input after successful submission
    } catch (err) {
      console.error("Error details:", err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || "Failed to process request");
      } else {
        setError(err instanceof Error ? err.message : "Failed to process request");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#2D3748] p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-bold mb-4">AI Assistant</h2>
      <form onSubmit={handlePromptSubmit} className="flex flex-col gap-4">
        <div className="flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask something or trigger a migration..."
            className="flex-1 px-4 py-2 rounded-l bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-r ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Submit"}
          </button>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-green-500 text-sm mt-2">
            {success}
          </div>
        )}
      </form>
    </div>
  );
};

export default Prompt;