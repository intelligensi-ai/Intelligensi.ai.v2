import React, { useState } from "react";

const Prompt: React.FC = () => {
  const [query, setQuery] = useState<string>("");

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Query submitted:", query);
    // Add your API call or action here
  };

  return (
    <div className="bg-[#2D3748] p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-bold mb-4">AI Assistant</h2>
      <form onSubmit={handlePromptSubmit} className="flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something or trigger a migration..."
          className="flex-1 px-4 py-2 rounded-l bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-r"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default Prompt;
