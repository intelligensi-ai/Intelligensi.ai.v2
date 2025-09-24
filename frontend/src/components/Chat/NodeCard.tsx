import { useState, useEffect } from "react";
import { NodeCardContent } from "../../types/chat";

interface NodeCardProps {
  content: NodeCardContent;
}

export const NodeCard: React.FC<NodeCardProps> = ({ content }) => {
  const [loaded, setLoaded] = useState({
    title: false,
    body: false,
    image: false,
    link: false,
  });

  // Simulate progressive loading
  useEffect(() => {
    const timers = [
      setTimeout(() => setLoaded(prev => ({ ...prev, title: true })), 200),
      setTimeout(() => setLoaded(prev => ({ ...prev, body: true })), 400),
      setTimeout(() => setLoaded(prev => ({ ...prev, image: true })), 600),
      setTimeout(() => setLoaded(prev => ({ ...prev, link: true })), 800),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  // Get content type with proper capitalization
  const getContentType = () => {
    if (!content.content_type) return '';
    return content.content_type.charAt(0).toUpperCase() + content.content_type.slice(1);
  };

  // Get a short preview of the body (first 30 characters)
  const getShortBody = () => {
    if (!content.body) return '';
    return content.body.length > 30 ? `${content.body.substring(0, 30)}...` : content.body;
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-4 my-2 w-full max-w-md border border-gray-200">
      {loaded.title && (
        <div className="text-sm text-gray-500 mb-1">
          ✅ Created {getContentType()}
        </div>
      )}
      
      {loaded.title && content.title && (
        <h3 className="text-lg font-semibold">{content.title}</h3>
      )}
      
      {loaded.body && content.body && (
        <p className="text-gray-700 text-sm mt-1 line-clamp-2">
          {getShortBody()}
        </p>
      )}
      
      {loaded.image && content.image && (
        <img
          src={content.image}
          alt={content.title || 'Node image'}
          className="rounded-xl mt-2 max-h-48 w-full object-cover"
          onLoad={() => setLoaded(prev => ({ ...prev, image: true }))}
        />
      )}
      
      {loaded.link && content.link && (
        <a
          href={content.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-blue-600 hover:underline text-sm flex items-center"
        >
          View {getContentType() || 'Node'}
          <svg
            className="w-3 h-3 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
};

export default NodeCard;
