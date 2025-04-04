import NewSiteForm from '../../components/Sites/NewSiteForm';
// src/components/Sites/Sites.tsx
import React, { useState } from 'react';
import { ISite } from '../../types/sites';

// Plus icon SVG component
const PlusIcon = () => (
  <svg 
    className="w-4 h-4 mr-2" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
    />
  </svg>
);

// Helper functions remain the same
const getSiteIcon = (siteName: string): string => {
  const icons: Record<string, string> = {
    'drupal': 'icons/drupal7.png',
    'wordpress': '/wordpress-logo.png',
    'joomla': '/joomla-logo.png',
  };
  return icons[siteName.toLowerCase()] || 'icons/drupal7.png';
};

const getSiteDisplayName = (siteName: string): string => {
  const displayNames: Record<string, string> = {
    'drupal': 'Drupal',
    'wordpress': 'WordPress',
    'joomla': 'Joomla',
  };
  return displayNames[siteName.toLowerCase()] || siteName;
};

interface SitesProps {
  sites: ISite[];
  onSiteAdded: (newSite: ISite) => void;
}

const Sites: React.FC<SitesProps> = ({ sites, onSiteAdded }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="bg-[#2D3748] p-4 border-t border-gray-700 relative">
      {/* New Site Button - Left-aligned with SVG icon */}
      <button 
        onClick={() => setIsFormOpen(true)}
        className="absolute top-4 left-4 bg-teal-400 hover:bg-teal-700 text-white px-3 py-2 rounded-md text-sm flex items-center transition-colors duration-200 shadow-md"
      >
        <PlusIcon />
        <span>New Site</span>
      </button>

      {/* Sites Display - Improved layout */}
      <div className="flex pl-40 bg-[#2D3748]"> 
        <div className="flex overflow-x-auto pb-2  flex-1">
          {sites.length === 0 ? (
            <div className="text-gray-400 italic flex items-center">No sites connected</div>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="flex flex-col items-center min-w-[90px] group">
                <img 
                  src={getSiteIcon(site.site_name)} 
                  alt={`${site.site_name} Logo`}
                  className="w-15 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
                />
                <span className="text-xs mt-1 text-gray-300 group-hover:text-white transition-colors">
                  {getSiteDisplayName(site.site_name)}
                </span>
              </div>
            ))
          )}
        </div>
        
        {/* Connected Sites - Right-aligned with distinct styling */}
        <div className="bg-[#3A4556] px-4 py-2 rounded-lg ml-4 border border-gray-600 shadow-sm">
          <h3 className="font-semibold mb-1 text-gray-100">Connected Sites</h3>
          <div className="text-sm text-blue-300 font-medium">
            {sites.length} site{sites.length !== 1 ? 's' : ''} connected
          </div>
        </div>
      </div>

      {/* New Site Form */}
      <NewSiteForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={(newSite) => {
          onSiteAdded(newSite);
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

export default Sites;