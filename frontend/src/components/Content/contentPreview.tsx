import React from 'react';

interface ContentPreviewProps {
  site: {
    name: string;
    site_name?: string;
  };
  onClose: () => void;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ site, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Content Preview: {site.site_name || site.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          Content preview is not available in this view.
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;
// }

// const ContentPreview: React.FC<ContentPreviewProps> = ({ site, onClose }) => {
//   const [content, setContent] = useState<ContentNode[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

//   const constructEndpointUrl = (baseUrl: string) => {
//     try {
//       // Ensure the URL has a protocol
//       let url = baseUrl;
//       if (!url.startsWith('http://') && !url.startsWith('https://')) {
//         url = `https://${url}`;
//       }

//       // Remove trailing slash if present
//       url = url.replace(/\/$/, '');

//       // Append the API endpoint
//       return `${url}/api/bulk-export`;
//     } catch (error) {
//       console.error('Error constructing endpoint URL:', error);
//       return null;
//     }
//   };

//   useEffect(() => {
//     const loadMockContent = () => {
//       try {
//         setLoading(true);
//         setError(null);
//         // Use mock data instead of API call
//         setContent(mockContent);
//       } catch (err) {
//         console.error('Error loading mock content:', err);
//         setError('Failed to load content. Using sample data instead.');
//         // Fallback to sample data if JSON parsing fails
//         setContent([{
//           nid: 'sample-1',
//           title: 'Sample Article',
//           created: new Date().toISOString(),
//           status: '1',
//           type: 'article',
//           body: 'This is a sample article content. In a real scenario, this would be loaded from your Drupal site.'
//         }]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadMockContent();
//   }, []); // Empty dependency array since we're not using any props/state


//   const toggleNode = (nid: string) => {
//     setExpandedNodes(prev => {
//       const newSet = new Set(prev);
//       if (newSet.has(nid)) {
//         newSet.delete(nid);
//       } else {
//         newSet.add(nid);
//       }
//       return newSet;
//     });
//   };

//   const formatDate = (timestamp: string) => {
//     try {
//       const date = new Date(parseInt(timestamp) * 1000);
//       return date.toLocaleDateString();
//     } catch (e) {
//       return 'Unknown date';
//     }
//   };

//   const renderContent = () => {
//     if (loading) {
//       return <div className="p-4 text-center">Loading content...</div>;
//     }

//     if (error) {
//       return (
//         <div className="p-4 text-red-600 bg-red-50 rounded">
//           <p className="font-semibold">Error loading content</p>
//           <p className="text-sm">{error}</p>
//         </div>
//       );
//     }

//     if (content.length === 0) {
//       return <div className="p-4 text-gray-500">No content available</div>;
//     }

//     return (
//       <div className="divide-y divide-gray-200">
//         {content.map((item) => (
//           <div key={item.nid} className="py-4">
//             <div 
//               className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
//               onClick={() => toggleNode(item.nid)}
//             >
//               <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
//               <span className="text-sm text-gray-500">
//                 {formatDate(item.created)} • {item.type}
//               </span>
//             </div>
            
//             {expandedNodes.has(item.nid) && (
//               <div className="mt-2 p-2 bg-gray-50 rounded">
//                 <div 
//                   className="prose max-w-none" 
//                   dangerouslySetInnerHTML={{ __html: item.body }} 
//                 />
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     );
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
//       <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6">
//         <div className="flex justify-between items-center mb-6">
//           <h2 className="text-2xl font-bold">Content Preview</h2>
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700"
//             aria-label="Close preview"
//           >
//             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>
        
//         <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
//           <p className="text-sm text-blue-700">
//             <strong>Note:</strong> This is a preview using mock data. In a real scenario, this would show content from your Drupal site.
//           </p>
//         </div>
        
//         {renderContent()}
//       </div>
//     </div>
//   );
// }
//     >
//       <div className="bg-[#2D3748] rounded-lg p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
//         <div className="flex justify-between items-center mb-6">
//           <h2 className="text-xl font-bold text-white">
//             Content Preview: {site.site_name}
//           </h2>
//           <button 
//             onClick={onClose}
//             className="text-gray-400 hover:text-white transition-colors"
//             aria-label="Close preview"
//           >
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         <div className="overflow-y-auto flex-1 pr-2">
//           {loading ? (
//             <div className="flex flex-col items-center justify-center h-32 space-y-2">
//               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
//               <p className="text-gray-400">Loading content...</p>
//             </div>
//           ) : error ? (
//             <div className="bg-[#1F2937] border border-red-500/50 rounded-lg p-4 mb-6">
//               <div className="flex items-start text-gray-200">
//                 <svg className="w-5 h-5 mr-3 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 <div>
//                   <p className="font-medium">Could not load content</p>
//                   <p className="text-sm mt-1">{error}</p>
//                   <button
//                     onClick={() => window.location.reload()}
//                     className="mt-2 text-sm text-blue-400 hover:text-blue-300"
//                   >
//                     Try again
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ) : content.length === 0 ? (
//             <div className="bg-[#344054] p-4 rounded-lg border border-gray-600 text-center">
//               <p className="text-gray-400 italic">No content found for this site.</p>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {content.slice(0, 10).map((node) => (
//                 <div 
//                   key={node.nid} 
//                   className="bg-[#344054] p-4 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
//                 >
//                   <h3 className="font-bold text-sm text-teal-400 truncate">{node.title}</h3>
//                   <div className="text-xs text-gray-400 mb-2">
//                     {formatDate(node.created)} | {node.type} | {node.status === "1" ? "Published" : "Unpublished"}
//                   </div>
//                   <div className="text-gray-300 text-sm line-clamp-3">
//                     {cleanBodyText(node.body)}
//                   </div>
//                   {cleanBodyText(node.body).split('\n').length > 3 && (
//                     <button
//                       onClick={() => toggleExpand(node.nid)}
//                       className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
//                     >
//                       {expandedNodes.has(node.nid) ? 'Show less' : 'Read more...'}
//                     </button>
//                   )}
//                 </div>
//               ))}
//               {content.length > 10 && (
//                 <div className="bg-[#344054] p-4 rounded border border-gray-600 flex items-center justify-center">
//                   <span className="text-gray-400">
//                     +{content.length - 10} more items
//                   </span>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-4">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors text-sm font-medium"
//           >
//             Close Preview
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContentPreview;